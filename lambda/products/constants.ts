export const PRODUCTS = {
  DDB: {
    NAME: 'ProductsDdb',
    TABLE_NAME: 'products',
    PK: 'id',
  },
  LAMBDA: {
    FETCH_FUNCTION: {
      NAME: 'ProductsFetchFunction',
      PATH: 'lambda/products/functions/productsFetchFunction.ts',
    },
    EVENTS_FUNCTION: {
      NAME: 'ProductsEventsFunction',
      PATH: 'lambda/products/functions/productEventsFunction.ts',
    },
    ADMIN_FUNCTION: {
      NAME: 'ProductsAdminFunction',
      PATH: 'lambda/products/functions/productsAdminFunction.ts',
    }
  },
  LAYERS: {
    PRODUCTS_LAYER: {
      NAME: 'ProductsLayer',
      ARN: 'ProductsLayerVersionArn',
      PATH: 'lambda/products/layers/productsLayer'
    },
    PRODUCT_EVENTS_LAYER: {
      NAME: 'ProductEventsLayer',
      ARN: 'ProductEventsLayerVersionArn',
      PATH: 'lambda/products/layers/productEventsLayer'
    }
  }
} as const