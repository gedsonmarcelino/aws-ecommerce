import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { v4 as uuid } from "uuid";

export interface OrderProduct {
  price: number;
  code: string;
}

export interface BillingInfo {
  totalPrice: number;
  payment: "CASH" | "CREDIT_CARD" | "DEBIT_CARD";
}

export interface ShippingInfo {
  type: "URGENT" | "ECONOMIC";
  carrier: "CORREIOS" | "FEDEX";
}

export interface Order {
  pk: string;
  sk?: string;
  createdAt?: number;
  products: OrderProduct[];
  billing: BillingInfo;
  shipping: ShippingInfo;
}

export class OrderRepository {
  private ddbClient: DocumentClient;
  private ordersTableName: string;

  constructor(ddbClient: DocumentClient, ordersTableName: string) {
    this.ddbClient = ddbClient;
    this.ordersTableName = ordersTableName;
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    const params: DocumentClient.QueryInput = {
      TableName: this.ordersTableName,
      KeyConditionExpression: "pk = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    };
    const result = await this.ddbClient.query(params).promise();
    return result.Items as Order[];
  }

  async getOrderByEmailAndOrderId(email: string, orderId: string): Promise<Order> {
    const params: DocumentClient.GetItemInput = {
      TableName: this.ordersTableName,
      Key: {
        pk: email,
        sk: orderId,
      },
    };
    const result = await this.ddbClient.get(params).promise();

    if ( !result.Item ) throw new Error("Order not found");
    return result.Item as Order;
  }

  async deleteOrder(email: string, orderId: string): Promise<Order> {
    const params: DocumentClient.DeleteItemInput = {
      TableName: this.ordersTableName,
      Key: {
        pk: email,
        sk: orderId,
      },
      ReturnValues: "ALL_OLD",
    };
    const result = await this.ddbClient.delete(params).promise();
    if ( !result.Attributes ) throw new Error("Order not found"); 
    return result.Attributes as Order;
  }

  async createOrder(order: Order): Promise<Order> {
    order.sk = uuid();
    order.createdAt = Date.now();

    const params: DocumentClient.PutItemInput = {
      TableName: this.ordersTableName,
      Item: order,
    };
    await this.ddbClient.put(params).promise();
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    const params: DocumentClient.ScanInput = {
      TableName: this.ordersTableName,
    };
    const result = await this.ddbClient.scan(params).promise();
    return result.Items as Order[];
  }
}