
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function App() {
	const [pokemon, setPokemon] = useState([])

	async function loadPokemon() {
		const { data } = await supabase
			.from('pokemon_claims')
			.select('*')
			.order('dex_number')

		setPokemon(data)
	}

	async function claim(id, owner) {
		await supabase
			.from('pokemon_claims')
			.update({
				claimed_by: owner,
				claimed_at: new Date()
			})
			.eq('id', id)

		loadPokemon()
	}

	useEffect(() => {
		loadPokemon()
	}, [])

	return (
		<div style={{ padding: 20 }}>
			<h1>Pokemon Binder Tracker</h1>

			{pokemon.map(p => (
				<div
					key={p.id}
					style={{
						border: '1px solid gray',
						margin: 5,
						padding: 10
					}}
				>
					#{p.dex_number} {p.pokemon_name}

					<br />

					{p.claimed_by ? (
						<strong>
							Claimed by {p.claimed_by}
						</strong>
					) : (
						<>
							<button
								onClick={() =>
									claim(p.id, 'You')
								}
							>
								Claim
							</button>

							<button
								onClick={() =>
									claim(p.id, 'Brother')
								}
							>
								Brother Claims
							</button>
						</>
					)}
				</div>
			))}
		</div>
	)
}

export default App
