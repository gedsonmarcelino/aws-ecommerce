import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { v4 as uuid } from 'uuid';

const PRODUCT_KEYS = [
  'id',
  'productName',
  'code',
  'price',
  'model',
  'productUrl'
];

export interface Product {
  id: string;
  productName: string;
  code: string;
  price: number;
  model: string;
  productUrl: string;
}

const mappingCreateData = (data: Partial<Product>) => {
  return Object.entries(data).reduce(
    (acc, [key, value]) => {
      if ( !PRODUCT_KEYS.includes(key) ) return acc;
      acc[key] = value;
      return acc;
    },
    {} as { [key: string]: any }
  );
}

const mappingUpdateExpression = (data: Partial<Product>) => {
  return 'set ' + Object.keys(data)
    .filter((key) => PRODUCT_KEYS.includes(key))
    .map((key) => `${key} = :${key}`)
    .join(', ');
}

const mappingExpressionAttributeValues = (data: Partial<Product>) => {
  return Object.entries(data).reduce(
    (acc, [key, value]) => {
      if ( !PRODUCT_KEYS.includes(key) ) return acc;
      acc[':'+ key] = value;
      return acc;
    },
    {} as { [key: string]: any }
  );
}

export class ProductRepository {
  private readonly ddbClient: DocumentClient;
  private readonly productsTable: string;

  constructor(ddbClient: DocumentClient, productsTable: string) {
    this.ddbClient = ddbClient;
    this.productsTable = productsTable;
  }

  async getAllProducts(): Promise<Product[]> {
    const params: DocumentClient.ScanInput = {
      TableName: this.productsTable,
    };

    const result = await this.ddbClient.scan(params).promise();
    return result.Items as Product[];
  }

  async createProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    const newProduct: Product = {
      id: uuid(),
      ...mappingCreateData(productData) as Omit<Product, 'id'>
    };

    const params: DocumentClient.PutItemInput = {
      TableName: this.productsTable,
      Item: newProduct,
    };

    await this.ddbClient.put(params).promise();
    return newProduct;
  }

  async getProductById(id: string): Promise<Product> {
    const params: DocumentClient.GetItemInput = {
      TableName: this.productsTable,
      Key: { id },
    };

    const result = await this.ddbClient.get(params).promise();

    if ( !result.Item ) throw new Error('Product not found');

    return result.Item as Product;
  }

  async deleteProduct(id: string): Promise<Product> {
    const params: DocumentClient.DeleteItemInput = {
      TableName: this.productsTable,
      Key: { id },
      ReturnValues: 'ALL_OLD',
    };

    const data = await this.ddbClient.delete(params).promise();

    if ( !data.Attributes ) throw new Error('Product not found');

    return data.Attributes as Product;
  }

  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {

    const params: DocumentClient.UpdateItemInput = {
      TableName: this.productsTable,
      Key: { id },
      ConditionExpression: 'attribute_exists(id)',
      ReturnValues: 'UPDATED_NEW',
      UpdateExpression: mappingUpdateExpression(productData),
      ExpressionAttributeValues: mappingExpressionAttributeValues(productData),
    };

    const data = await this.ddbClient.update(params).promise();

    if ( !data.Attributes ) throw new Error('Product not found');

    return data.Attributes as Product;
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    const keys = ids.map(id => ({ id }));
    
    const params: DocumentClient.BatchGetItemInput = {
      RequestItems: {
        [this.productsTable]: {
          Keys: keys,
        },
      },
    };
    const result = await this.ddbClient.batchGet(params).promise();
    return result.Responses ? result.Responses[this.productsTable] as Product[] : [];
  }
}