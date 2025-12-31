interface SearchResult {
  title: string
  link: string
  snippet: string
}

interface ScrapingDogResponse {
  organic_results?: Array<{
    title: string
    link: string
    snippet: string
  }>
}

export async function webSearch(
  query: string,
  apiKey: string
): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query)
  const url = `https://api.scrapingdog.com/google?api_key=${apiKey}&query=${encodedQuery}&results=5`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Search API error: ${response.status}`)
  }

  const data: ScrapingDogResponse = await response.json()

  if (!data.organic_results) {
    return []
  }

  return data.organic_results.map((result) => ({
    title: result.title,
    link: result.link,
    snippet: result.snippet,
  }))
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No search results found.'
  }

  return results
    .map(
      (result, index) =>
        `[${index + 1}] ${result.title}\n${result.snippet}\nSource: ${result.link}`
    )
    .join('\n\n')
}
