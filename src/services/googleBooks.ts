
const GOOGLE_BOOKS_API_KEY = 'AIzaSyDSGm97K_kt3evfXe3klrPtNF1Q4vrW_2Y';
const BASE_URL = 'https://www.googleapis.com/books/v1';

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail: string;
      smallThumbnail?: string;
    };
    publishedDate?: string;
    publisher?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
  };
}

export const searchBooks = async (query: string): Promise<GoogleBook[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/volumes?q=${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_API_KEY}&maxResults=10`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch books');
    }
    
    const data = await response.json();
    console.log('API Response:', data);
    return data.items || [];
  } catch (error) {
    console.error('Error searching books:', error);
    throw error;
  }
};

export const getBookById = async (id: string): Promise<GoogleBook> => {
  try {
    const response = await fetch(
      `${BASE_URL}/volumes/${id}?key=${GOOGLE_BOOKS_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch book details');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching book details:', error);
    throw error;
  }
};
