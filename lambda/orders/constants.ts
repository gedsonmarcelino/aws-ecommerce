export const ORDERS = {
  DDB: {
    NAME: 'OrdersDdb',
    TABLE_NAME: 'orders',
    PK: 'pk',
    SK: 'sk',
  },
  TOPIC: {
    ID: 'OrderEventsTopic',
    NAME: 'order-events',
    DISPLAY_NAME: 'Order events topic',
  },
  LAMBDA: {
    ORDERS_FUNCTION: {
      NAME: 'OrdersFunction',
      PATH: 'lambda/orders/functions/ordersFunction.ts',
    },
    ORDERS_EVENTS_FUNCTION: {
      NAME: 'OrderEventsFunction',
      PATH: 'lambda/orders/functions/orderEventsFunction.ts',
    },
  },
  LAYERS: {
    ORDERS_LAYER: {
      NAME: 'OrdersLayer',
      ARN: 'OrdersLayerVersionArn',
      PATH: 'lambda/orders/layers/ordersLayer'
    },
    ORDERS_API_LAYER: {
      NAME: 'OrdersApiLayer',
      ARN: 'OrdersApiLayerVersionArn',
      PATH: 'lambda/orders/layers/ordersApiLayer'
    },
    ORDERS_EVENTS_LAYER: {
      NAME: 'OrdersEventsLayer',
      ARN: 'OrdersEventsLayerVersionArn',
      PATH: 'lambda/orders/layers/ordersEventsLayer'
    },
    ORDERS_EVENTS_REPOSITORY_LAYER: {
      NAME: 'OrdersEventsRepositoryLayer',
      ARN: 'OrdersEventsRepositoryLayerVersionArn',
      PATH: 'lambda/orders/layers/ordersEventsRepositoryLayer'
    }
  }
} as const