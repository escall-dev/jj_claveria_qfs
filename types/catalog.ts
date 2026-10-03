export interface Brand {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface UOM {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  brandId?: string;
  itemCode?: string;
  description: string;
  uomId?: string;
  unitPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}
