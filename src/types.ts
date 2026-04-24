export interface Product {
  objectID: string;
  name: string;
  brand: string;
  ingredients: string;
  price?: number;
  imageUrl?: string;
  healthWarning?: string;
}
