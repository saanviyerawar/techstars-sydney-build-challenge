const staticMode = import.meta.env.VITE_STATIC_DATA === 'true'

let staticFounders

async function fetchJson(url, options) {
    const response = await fetch(url, options)
    const data = await response.json()
    if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }
    return data
}

async function loadStaticFounders() {
    if (!staticFounders) {
        staticFounders = await fetchJson(`${import.meta.env.BASE_URL}founders.json`)
    }
    return staticFounders
}

function matches(profile, filters) {
    const contains = (value, expected) =>
        String(value || '').toLowerCase().includes(expected.toLowerCase())
    const equals = (value, expected) =>
        String(value ?? '').toLowerCase() === expected.toLowerCase()

    if (filters.name && !contains(profile.name, filters.name)) return false
    if (filters.city && !contains(profile.city, filters.city)) return false
    if (filters.startup && !contains(profile.current_company, filters.startup)) return false
    if (filters.gender && !equals(profile.gender, filters.gender)) return false
    if (filters.migrant && !equals(profile.migrant, filters.migrant)) return false
    if (filters.founder_persona && !equals(profile.founder_persona, filters.founder_persona)) return false
    if (filters.curr_startup_industry && !equals(profile.curr_startup_industry, filters.curr_startup_industry)) return false
    if (filters.curr_startup_funding_stage && !equals(profile.curr_startup_funding_stage, filters.curr_startup_funding_stage)) return false
    return filters.tags.every((tag) => profile.tags?.some((item) => equals(item, tag)))
}

export const supportsLiveCollection = !staticMode

export async function searchFounders(filters) {
    if (staticMode) {
        const founders = await loadStaticFounders()
        return founders.filter((profile) => matches(profile, filters))
    }

    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
        if (key === 'tags') {
            value.forEach((tag) => params.append('tags', tag))
        } else if (value) {
            params.append(key, value)
        }
    })
    return fetchJson(`/api/search?${params.toString()}`)
}

export async function getFounder(founderId) {
    if (staticMode) {
        const founders = await loadStaticFounders()
        return founders.find((profile) => profile.id === Number(founderId)) || null
    }
    return fetchJson(`/api/founders/${founderId}`)
}

export function scrapeFounder(url) {
    return fetchJson('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
    })
}

export function discoverFounders(query, limit = 3) {
    return fetchJson('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit }),
    })
}
