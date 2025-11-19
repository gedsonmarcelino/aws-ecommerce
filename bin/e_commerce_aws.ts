#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ECommerceApiStack } from '../lib/ecommerceApi-stack';
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack';
import { EventsDdbStack } from '../lib/eventsDdb-stack';
import { OrdersAppLayersStack } from '../lib/ordersAppLayers-stack';
import { OrdersAppStack } from '../lib/ordersApp-stack';


const app = new cdk.App();

const env: cdk.Environment = {
  account: '421043920384',
  region: 'us-east-1',
};

const tags = {
  cost: 'ECommerceAWS',
  team: 'GDEV Ltda',
}

const ordersLayersStack = new OrdersAppLayersStack(app, 'OrdersAppLayersStack', {
  env,
  tags,
});

const productsLayersStack = new ProductsAppLayersStack(app, 'ProductsAppLayersStack', {
  env,
  tags,
});

const eventDdbStack = new EventsDdbStack(app, 'EventsDdb', {
  env,
  tags,
});

const productsAppStack = new ProductsAppStack(app, 'ProductsApp', {
  eventsDdb: eventDdbStack.table,
  env,
  tags,
});

productsAppStack.addDependency(productsLayersStack);
productsAppStack.addDependency(eventDdbStack);

const ordersAppStack = new OrdersAppStack(app, 'OrdersApp', {
  productsDdb: productsAppStack.productsDdb,
  eventsDdb: eventDdbStack.table,
  env,
  tags,
});

ordersAppStack.addDependency(ordersLayersStack);
ordersAppStack.addDependency(productsAppStack);
ordersAppStack.addDependency(eventDdbStack);

const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApiStack', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  ordersHandler: ordersAppStack.ordersHandler,
  env,
  tags,
});
eCommerceApiStack.addDependency(productsAppStack);
eCommerceApiStack.addDependency(ordersAppStack);