const API_BASE = ''

interface FetchResponse<T> {
    success: boolean
    data?: T
    error?: string
}

export async function fetchApi<T>(
    endpoint: string,
    options?: RequestInit
): Promise<FetchResponse<T>> {
    const url = `${API_BASE}${endpoint}`

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        return result
    } catch (error) {
        console.error(`API request failed: ${url}`, error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

export async function postApi<T>(
    endpoint: string,
    body?: unknown
): Promise<FetchResponse<T>> {
    return fetchApi<T>(endpoint, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
    })
}
