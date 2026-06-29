import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { POKEDEX } from './pokedex.js'

const STORAGE_KEY = 'pokemonBinder.caught'
const PROFILE_KEY = 'pokemonBinder.profile'
const PROFILES = ['Eli', 'Connor']
const REGIONAL_PREFIXES = new Set(['alolan', 'galarian', 'hisuian', 'paldean'])
const FORM_SUFFIXES = new Set([
  'attack',
  'defense',
  'speed',
  'origin',
  'altered',
  'sky',
  'land',
  'therian',
  'incarnate',
  'resolute',
  'ordinary',
  'aria',
  'pirouette',
  'heat',
  'wash',
  'frost',
  'fan',
  'mow',
  'sunshine',
  'rainy',
  'snowy',
  'plant',
  'sandy',
  'trash',
  'normal',
  'blade',
  'shield',
  'crown',
  'school',
  'solo',
  'dusk',
  'dawn',
  'midday',
  'midnight',
  'complete',
  '10%',
  '50%',
  'core',
  'busted',
  'disguised',
  'small',
  'average',
  'large',
  'super',
  'red',
  'blue',
  'yellow',
  'green',
  'orange',
  'indigo',
  'violet',
  'white',
  'black',
  'eternal',
  'zen',
  'hero',
  'crowned',
])
const GOLD_BORDER_POKEMON = new Set([
  'voltorb',
  'tauros',
  'noctowl',
  'flaaffy',
  'shedinja',
  'wingull',
  'turtwig',
  'rotom',
  'tirtouga',
  'klink',
  'aurorus',
  'goomy',
  'pyukumuku',
  'araquanid',
  'eiscue',
  'zacian',
  'tinkaton',
  'arboliva',
])

function normalizeCaughtShape(value) {
  if (!value || typeof value !== 'object') return {}

  const normalized = {}
  Object.entries(value).forEach(([dex, entry]) => {
    if (!entry || typeof entry !== 'object') return

    const hasProfileMap = entry.eli || entry.connor
    if (hasProfileMap) {
      normalized[dex] = {
        eli: entry.eli || null,
        connor: entry.connor || null,
      }
      return
    }

    const owner = (entry.owner || '').toLowerCase()
    if (owner === 'eli' || owner === 'connor') {
      normalized[dex] = {
        eli: owner === 'eli' ? entry : null,
        connor: owner === 'connor' ? entry : null,
      }
      return
    }

    // Keep pre-profile data by mapping it to Eli.
    if (entry.cardName || entry.cardImage || entry.cardUrl) {
      normalized[dex] = {
        eli: { ...entry, owner: 'Eli' },
        connor: null,
      }
    }
  })

  return normalized
}

function loadCaught() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return {}

  try {
    return normalizeCaughtShape(JSON.parse(stored))
  } catch {
    return {}
  }
}

function loadProfile() {
  const stored = localStorage.getItem(PROFILE_KEY)
  return PROFILES.includes(stored) ? stored : 'Eli'
}

function getBaseSearchName(name) {
  if (!name) return ''

  const trimmed = String(name).trim()
  if (!trimmed) return ''

  if (/^nidoran\s+[fm]$/i.test(trimmed)) return trimmed

  let normalized = trimmed
    .replace(/[()]/g, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const tokens = normalized.split(' ')

  if (tokens.length > 1 && REGIONAL_PREFIXES.has(tokens[0].toLowerCase())) {
    tokens.shift()
  }

  while (tokens.length > 1 && FORM_SUFFIXES.has(tokens[tokens.length - 1].toLowerCase())) {
    tokens.pop()
  }

  if (tokens.length > 1 && tokens[tokens.length - 1].toLowerCase() === 'form') {
    tokens.pop()
  }

  if (tokens.length === 0) return trimmed
  return tokens.join(' ')
}

export default function App() {
  const [caught, setCaught] = useState(() => loadCaught())
  const [activeProfile, setActiveProfile] = useState(() => loadProfile())
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedDex, setSelectedDex] = useState(null)
  const [cardChoice, setCardChoice] = useState({
    cardName: '',
    cardUrl: '',
  })
  const [availableCards, setAvailableCards] = useState([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [cardsError, setCardsError] = useState(null)
  const [selectedCardId, setSelectedCardId] = useState('')
  const [selectionUnavailable, setSelectionUnavailable] = useState(false)
  const cardCacheRef = useRef(new Map())
  const inFlightFetchesRef = useRef(new Map())
  const activeFetchIdRef = useRef(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(caught))
  }, [caught])

  const filteredPokemon = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return POKEDEX
    return POKEDEX.filter(
      (pokemon) =>
        pokemon.name.toLowerCase().includes(query) ||
        pokemon.dex.includes(query),
    )
  }, [search])

  const profileKey = activeProfile === 'Eli' ? 'eli' : 'connor'
  const caughtCount = useMemo(
    () => Object.values(caught).filter((entry) => !!entry?.[profileKey]).length,
    [caught, profileKey],
  )
  const selectedPokemon = selectedDex ? POKEDEX.find((pokemon) => pokemon.dex === selectedDex) : null
  const selectedProfileClaim = selectedDex ? caught[selectedDex]?.[profileKey] : null
  const selectedPokemonCaught = !!selectedProfileClaim
  const selectedCard = selectedCardId ? availableCards.find((c) => c.id === selectedCardId) : null
  const [selectionAction, setSelectionAction] = useState('card')

  useEffect(() => {
    setSelectionAction('card')
  }, [selectedDex])

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, activeProfile)
  }, [activeProfile])

  function handleChoiceChange(event) {
    const { name, value } = event.target
    setCardChoice((current) => ({ ...current, [name]: value }))
  }

  function selectPokemon(dex) {
    setSelectedDex(dex)
    const claim = caught[dex]?.[profileKey] || null
    if (claim) {
      setCardChoice({
        cardName: claim.cardName || '',
        cardUrl: claim.cardUrl || '',
      })
      setSelectedCardId(claim.cardId || '')
    } else {
      setCardChoice({ cardName: '', cardUrl: '' })
      setSelectedCardId('')
    }

    // fetch available TCG cards for this Pokémon (exclude Common/Uncommon/Rare)
    const pokemon = POKEDEX.find((p) => p.dex === dex)
    if (!pokemon) return
    const name = getBaseSearchName(pokemon.name)
    const cacheKey = name.toLowerCase()

    const cached = cardCacheRef.current.get(cacheKey)
    if (cached) {
      setAvailableCards(cached.availableCards)
      setSelectionUnavailable(cached.selectionUnavailable)
      setCardsError(null)
      setCardsLoading(false)
      return
    }

    setAvailableCards([])
    setSelectionUnavailable(false)
    setCardsError(null)
    setCardsLoading(true)
    const fetchId = activeFetchIdRef.current + 1
    activeFetchIdRef.current = fetchId

    const existingRequest = inFlightFetchesRef.current.get(cacheKey)
    const request = existingRequest || fetch(
      `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(`name:"${name}"`)}&pageSize=250`,
    )
      .then((res) => res.json())
      .finally(() => {
        inFlightFetchesRef.current.delete(cacheKey)
      })

    if (!existingRequest) {
      inFlightFetchesRef.current.set(cacheKey, request)
    }

    request
      .then((data) => {
        if (fetchId !== activeFetchIdRef.current) return

        const cards = data?.data || []
        const filtered = cards.filter((c) => {
          const r = (c.rarity || '').toLowerCase()
          const setName = (c.set?.name || '').toLowerCase()
          const subtypeText = (Array.isArray(c.subtypes) ? c.subtypes.join(' ') : '').toLowerCase()
          const cardName = (c.name || '').toLowerCase()
          const cardNumber = String(c.number || '').toLowerCase()
          const isCelebrations = /\bcelebrations\b/.test(setName)
          const isGalleryCard =
            /\bgallery\b/.test(setName) ||
            /\bgallery\b/.test(subtypeText) ||
            /^(tg|gg)\d+/.test(cardNumber)

          const isVVmaxOrGx =
            /(^|\s)(v|vmax|gx)(\s|$)/.test(subtypeText) ||
            /\s(v|vmax|gx)\b/.test(cardName)

          if (isCelebrations || isGalleryCard || isVVmaxOrGx) return true

          const excludedRarities = new Set(['common', 'uncommon', 'rare', 'double rare'])
          if (excludedRarities.has(r)) return false

          const isRareHolo = /\brare\s+holo\b/.test(r)
          const isAmazingRare = /\bamazing\s+rare\b/.test(r)
          const isShinyUltraRare = /\bshiny\s+ultra\s+rare\b/.test(r)
          const isShinyRarity = /\bshiny\b/.test(r) && !isShinyUltraRare
          const isRadiantRarity = /\bradiant\b/.test(r)
          if (isRareHolo || isAmazingRare || isShinyRarity || isRadiantRarity) return false

          const isMegaPokemon = /\bmega\b/.test(cardName) || /^m\s/.test(cardName)
          if (isMegaPokemon) return false

          const isTrainersPokemonBySubtype = /owner'?s\s+pokemon/.test(subtypeText)
          const isTrainersPokemonByName = /\b[a-z]+['’]s\b/.test(cardName)
          if (isTrainersPokemonBySubtype || isTrainersPokemonByName) return false

          const isRadiantCard = /\bradiant\b/.test(cardName) || /\bradiant\b/.test(subtypeText)
          if (isRadiantCard) return false

          const isBlackStarPromo = /black\s+star\s+promos?/.test(setName)
          const isFullArt = /full\s*art/.test(subtypeText) || /full\s*art/.test(cardName)
          if (isBlackStarPromo && !isFullArt) return false

          const isMcdonaldsPromo = /mcdonald/.test(setName)
          if (isMcdonaldsPromo) return false

          const isPokemonRumble = /pokemon\s+rumble|\brumble\b/.test(setName)
          if (isPokemonRumble) return false

          return true
        })
        const nextCards = filtered || []
        const unavailable = cards.length > 0 && nextCards.length === 0

        cardCacheRef.current.set(cacheKey, {
          availableCards: nextCards,
          selectionUnavailable: unavailable,
        })

        setAvailableCards(nextCards)
        setSelectionUnavailable(unavailable)
      })
      .catch((err) => {
        if (fetchId !== activeFetchIdRef.current) return
        setCardsError(err?.message || String(err))
        setSelectionUnavailable(false)
      })
      .finally(() => {
        if (fetchId !== activeFetchIdRef.current) return
        setCardsLoading(false)
      })
  }

  function completePokemon(event) {
    event.preventDefault()
    if (selectionUnavailable) return

    const cardName = cardChoice.cardName.trim()
    const cardUrl = cardChoice.cardUrl.trim()
    if (!cardName) return
    // if we have availableCards, require selectedCardId
    if (availableCards.length > 0 && !selectedCardId) return

    const cardData = availableCards.find((c) => c.id === selectedCardId)
    const payload = cardData
      ? {
          cardName: cardData.name,
          cardId: cardData.id,
          cardImage: cardData.images?.small || cardData.images?.large || '',
          cardUrl: cardData.images?.large || cardData.images?.small || '',
          rarity: cardData.rarity || '',
          owner: activeProfile,
        }
      : { cardName, cardUrl, owner: activeProfile }

    setCaught((current) => ({
      ...current,
      [selectedDex]: {
        eli: current[selectedDex]?.eli || null,
        connor: current[selectedDex]?.connor || null,
        [profileKey]: payload,
      },
    }))
    setSelectedDex(null)
  }

  function unclaimPokemon(dex) {
    setCaught((current) => {
      const next = { ...current }
      const entry = next[dex]
      if (!entry) return next

      const updated = {
        eli: entry.eli || null,
        connor: entry.connor || null,
      }
      updated[profileKey] = null

      if (!updated.eli && !updated.connor) {
        delete next[dex]
      } else {
        next[dex] = updated
      }

      return next
    })
    if (selectedDex === dex) setSelectedDex(null)
  }

  function renderCardDisplay(pokemon) {
    const entry = caught[pokemon.dex]
    const claim = entry?.[profileKey] || null

    if (!claim) {
      return (
        <div className="unclaimed-card">
          <img className="pokemon-thumb" src={pokemon.image} alt={pokemon.name} loading="lazy" />

          <div className="unclaimed-overlay">
            <div className="pokemon-card-meta">
              <span className="dex-number">#{pokemon.dex}</span>
              <strong>{pokemon.name}</strong>
            </div>

            <div className="pokemon-card-bottom">
              <span className="status-badge">Unclaimed</span>
            </div>
          </div>
        </div>
      )
    }

    const glowClass = profileKey === 'eli' ? 'eli-glow' : 'connor-glow'

    return (
      <div className={`card-single ${glowClass}`}>
        <img
          src={claim.cardImage || claim.cardUrl || pokemon.image}
          alt={claim.cardName || `${pokemon.name} card`}
          loading="lazy"
        />
      </div>
    )
  }

  function clearSelection() {
    setSelectedDex(null)
  }

  return (
    <div className="app-shell">
      <div className="profile-switcher">
        <button
          type="button"
          className="profile-toggle-button"
          onClick={() => setShowProfileMenu((open) => !open)}
        >
          Profile: {activeProfile}
        </button>
        {showProfileMenu ? (
          <div className="profile-menu" role="menu" aria-label="Profile selector">
            {PROFILES.map((profile) => (
              <button
                key={profile}
                type="button"
                className={`profile-menu-item ${activeProfile === profile ? 'active' : ''}`}
                onClick={() => {
                  setActiveProfile(profile)
                  setShowProfileMenu(false)
                }}
              >
                {profile}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <header className="top-bar">
        <div>
          <p className="overline">Pokédex</p>
          <h1>Claim your Pokémon</h1>
          <p className="subhead">
            Search the National Pokédex and mark a Pokémon complete by choosing
            an official Pokémon TCG card.
          </p>
        </div>

        <div className="search-group">
          <input
            className="search-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or number"
          />
          <div className="summary">{caughtCount} / {POKEDEX.length} complete</div>
        </div>
      </header>

      {selectedPokemon ? (
        <section className="selection-panel">
          <div className="selection-modal">
            <div className="selection-header">
              <div>
                <h2>{selectedPokemonCaught ? 'Update card selection' : `Complete ${selectedPokemon.name}`}</h2>
                <p className="selection-subhead">
                  Choose an official Pokémon TCG card from the Pokémon TCG Card
                  Database to complete this entry.
                </p>
              </div>
              <button className="secondary-button" type="button" onClick={clearSelection}>
                Cancel
              </button>
            </div>

            <form className="selection-form" onSubmit={completePokemon}>
              <div className="selection-row">
                {cardsLoading ? (
                  <div>Loading card list…</div>
                ) : selectionUnavailable ? (
                  <div className="unavailable-state">Unavailable</div>
                ) : availableCards.length > 0 ? (
                  <label>
                    Choose card
                    <div className="card-options-grid" role="listbox" aria-label="Choose card">
                      {availableCards.map((card) => (
                        <button
                          key={card.id}
                          className={`card-grid-option ${selectedCardId === card.id ? 'selected' : ''}`}
                          type="button"
                          onClick={() => {
                            setSelectedCardId(card.id)
                            setCardChoice((cur) => ({
                              ...cur,
                              cardName: card.name,
                              cardUrl: card.images?.large || card.images?.small || '',
                            }))
                          }}
                        >
                          <img
                            src={card.images?.small || card.images?.large || ''}
                            alt={card.name}
                          />
                          <span className="card-grid-title">{card.name}</span>
                          <span className="card-grid-meta">
                            {card.rarity || 'Unknown'}{card.set ? ` (${card.set.name})` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  </label>
                ) : (
                  <>
                    <label>
                      Card name
                      <input
                        name="cardName"
                        value={cardChoice.cardName}
                        onChange={handleChoiceChange}
                        placeholder="Charizard VMAX, Pikachu V, etc."
                        required
                      />
                    </label>

                    <label>
                      Card page URL
                      <input
                        name="cardUrl"
                        value={cardChoice.cardUrl}
                        onChange={handleChoiceChange}
                        placeholder="https://www.pokemontcg.com/..."
                        required
                      />
                    </label>
                  </>
                )}
              </div>

            {(selectedCard || selectedProfileClaim) ? (
              <div className="card-preview">
                <img
                  src={
                    (selectedCard && (selectedCard.images?.large || selectedCard.images?.small)) ||
                    selectedProfileClaim?.cardImage ||
                    cardChoice.cardUrl ||
                    ''
                  }
                  alt={selectedCard ? selectedCard.name : cardChoice.cardName}
                />
                <div className="preview-meta">
                  <strong className="preview-title">{selectedCard ? selectedCard.name : cardChoice.cardName}</strong>
                  { (selectedCard?.rarity || selectedProfileClaim?.rarity) ? (
                    <span className="rarity-badge">{selectedCard?.rarity || selectedProfileClaim?.rarity}</span>
                  ) : null }
                </div>
              </div>
            ) : null}

            <div className="action-group">
              <button className="primary-button claim-button" type="submit" disabled={selectionUnavailable}>
                {selectedPokemonCaught ? 'Save selection' : 'Complete Pokémon'}
              </button>
              {selectedPokemonCaught ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => unclaimPokemon(selectedDex)}
                >
                  Unclaim
                </button>
              ) : null}
            </div>

              {selectedPokemonCaught ? (
                <p className="selection-note">
                  Current card:{' '}
                    <select
                      value={selectionAction}
                      onChange={(e) => {
                        const val = e.target.value
                        setSelectionAction('card')
                        if (val === 'open') {
                          const url = selectedProfileClaim?.cardUrl || selectedProfileClaim?.cardImage
                          if (url) window.open(url, '_blank', 'noopener')
                        }
                        if (val === 'unclaim') {
                          unclaimPokemon(selectedDex)
                        }
                        if (val === 'view') {
                          // show selected card details in the form if possible
                          const cid = selectedProfileClaim?.cardId
                          if (cid) setSelectedCardId(cid)
                        }
                      }}
                    >
                      <option value="card">{selectedProfileClaim?.cardName}</option>
                      <option value="open">Open card page</option>
                      <option value="view">View in selection</option>
                      <option value="unclaim">Unclaim</option>
                    </select>
                </p>
              ) : null}
            </form>
          </div>
        </section>
      ) : null}

      <main>
        <div className="pokedex-grid">
          {filteredPokemon.map((pokemon) => {
            const isCaught = !!caught[pokemon.dex]?.[profileKey]
            const ownerClass = profileKey === 'eli' ? ' owner-eli' : ' owner-connor'
            const isGoldBorder = GOLD_BORDER_POKEMON.has(pokemon.name.toLowerCase())
            return (
              <button
                key={pokemon.dex}
                type="button"
                className={`pokemon-card ${isCaught ? `caught claimed${ownerClass}` : 'uncaught'}${isGoldBorder ? ' special-gold' : ''}`}
                onClick={() => selectPokemon(pokemon.dex)}
              >
                {renderCardDisplay(pokemon)}
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
