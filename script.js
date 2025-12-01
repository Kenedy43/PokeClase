// Base de la PokéAPI usada para todas las peticiones REST.
const API_BASE = "https://pokeapi.co/api/v2";

const searchForm = document.getElementById("search-form");
const pokemonInput = document.getElementById("pokemon-input");
const statusBox = document.getElementById("status");
const pokemonCard = document.getElementById("pokemon-card");

// Grid donde irán los Pokémon por tipo
const typeGrid = document.getElementById("type-grid");

// Helpers
const capitalize = (text = "") => text.charAt(0).toUpperCase() + text.slice(1);
const typeClass = (type = "") =>
  `type-${type.toLowerCase().replace(/[^a-z0-9-]/g, "") || "normal"}`;

const getSprite = (pokemon) =>
  pokemon?.sprites?.other?.["official-artwork"]?.front_default ||
  pokemon?.sprites?.front_default ||
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png";

// Mostrar mensaje de estado
const setStatus = (message = "", tone = "info") => {
  if (!message) {
    statusBox.classList.remove("visible");
    statusBox.textContent = "";
    return;
  }
  statusBox.textContent = message;
  statusBox.dataset.tone = tone;
  statusBox.classList.add("visible");
};

// Buscar Pokémon individual
const getPokemon = async (name) => {
  const response = await fetch(`${API_BASE}/pokemon/${encodeURIComponent(name.toLowerCase())}`);
  if (!response.ok) throw new Error("not-found");
  return response.json();
};

// Render de Pokémon individual
const renderSingle = (pokemon) => {
  if (!pokemon) {
    pokemonCard.className = "card single-card empty";
    pokemonCard.innerHTML = '<p class="placeholder">No se encontró el Pokémon solicitado.</p>';
    return;
  }

  const types = pokemon.types
    .map((entry) => `<span class="pill ${typeClass(entry.type.name)}">${capitalize(entry.type.name)}</span>`)
    .join("");

  const abilities = pokemon.abilities
    .slice(0, 2)
    .map((item) => capitalize(item.ability.name))
    .join(", ");

  const primaryType = pokemon.types?.[0]?.type?.name || "normal";

  pokemonCard.className = `card single-card ${typeClass(primaryType)}`;
  pokemonCard.innerHTML = `
    <div class="card-header">
      <div class="pill">#${pokemon.id}</div>
      <div class="types">${types}</div>
    </div>
    <div class="sprite">
      <img src="${getSprite(pokemon)}" alt="${capitalize(pokemon.name)}" loading="lazy">
    </div>
    <h3 class="name">${capitalize(pokemon.name)}</h3>
    <div class="meta">
      <div><span>Altura</span>${(pokemon.height / 10).toFixed(1)} m</div>
      <div><span>Peso</span>${(pokemon.weight / 10).toFixed(1)} kg</div>
      <div><span>Base XP</span>${pokemon.base_experience}</div>
      <div><span>Habilidades</span>${abilities || "N/D"}</div>
    </div>
  `;
};

// Render del grid por tipo
const renderTypeGrid = (list) => {
  if (!list.length) {
    typeGrid.innerHTML = '<p class="placeholder">No se pudieron cargar los Pokémon.</p>';
    return;
  }

  typeGrid.innerHTML = list
    .map(
      (pokemon) => `
      <article class="card ${typeClass(pokemon.types?.[0]?.type?.name || "normal")}">
        <div class="card-header">
          <div class="pill">#${pokemon.id}</div>
          <div class="types">
            ${pokemon.types
              .map((t) => `<span class="pill ${typeClass(t.type.name)}">${capitalize(t.type.name)}</span>`)
              .join("")}
          </div>
        </div>
        <div class="sprite">
          <img src="${getSprite(pokemon)}" alt="${capitalize(pokemon.name)}" loading="lazy">
        </div>
        <h3 class="name">${capitalize(pokemon.name)}</h3>
      </article>
    `
    )
    .join("");
};

// Carga genérica por tipo
const handleType = async (type, gridElement) => {
  const button = document.getElementById(`${type}-btn`);

  button.disabled = true;
  gridElement.innerHTML = '<p class="placeholder">Cargando lista...</p>';
  setStatus(`Cargando todos los Pokémon de tipo ${type}...`, "info");

  try {
    const response = await fetch(`${API_BASE}/type/${type}`);
    if (!response.ok) throw new Error("type-fetch-failed");

    const data = await response.json();
    if (!data.pokemon || !Array.isArray(data.pokemon)) {
      throw new Error("invalid-response");
    }

    const pokemon = data.pokemon;
    const names = pokemon.map((p) => p.pokemon.name);

    const detailResults = await Promise.allSettled(names.map((n) => getPokemon(n)));

    const list = detailResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value)
      .sort((a, b) => a.id - b.id);

    renderTypeGrid(list);
    setStatus(`Listo: ${list.length} Pokémon de tipo ${document.getElementById(type + "-btn").textContent}.`, "ok");

  } catch (error) {
    console.error(`Error loading type ${type}:`, error);
    gridElement.innerHTML = '<p class="placeholder">No se pudo cargar la lista.</p>';
    setStatus("Error al cargar este tipo. Intenta de nuevo.", "error");
  } finally {
    button.disabled = false;
  }
};

// Control de búsqueda individual
const handleSearch = async (event) => {
  event.preventDefault();
  const query = pokemonInput.value.trim();

  if (!query) {
    setStatus("Ingresa el nombre o el ID de un Pokémon para buscar.", "error");
    renderSingle(null);
    return;
  }

  setStatus(`Buscando a ${query}...`, "info");

  try {
    const pokemon = await getPokemon(query);
    renderSingle(pokemon);
    setStatus(`${capitalize(query)} encontrado.`, "ok");
  } catch (error) {
    renderSingle(null);
    setStatus("No pudimos encontrar ese Pokémon por favor escriba bien el nombre del pokémon o no ponga un número que sobre pase los 1025 pokémon existentes.", "error");
  }
};

searchForm?.addEventListener("submit", handleSearch);

// REGISTRO AUTOMÁTICO DE TODOS LOS BOTONES DE TIPO
[
  "normal", "fire", "water", "grass", "electric",
  "ice", "fighting", "poison", "ground", "flying",
  "psychic", "bug", "rock", "ghost", "dragon",
  "dark", "steel", "fairy"
].forEach(type =>
  document.getElementById(`${type}-btn`)
    ?.addEventListener("click", () => handleType(type, typeGrid))
);
