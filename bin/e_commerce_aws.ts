#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ECommerceApiStack } from '../lib/ecommerceApi-stack';
import { EventsDdbStack } from '../lib/eventsDdb-stack';
import { OrdersAppStack } from '../lib/ordersApp-stack';
import { ECommerceLayersStack } from '../lib/ecommerceLayers-stack';


const app = new cdk.App();

const env: cdk.Environment = {
  account: '421043920384',
  region: 'us-east-1',
};

const tags = {
  cost: 'ECommerceAWS',
  team: 'GDEV Ltda',
}

const ecommerceLayersStack = new ECommerceLayersStack(app, 'ECommerceLayersStack', {
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

productsAppStack.addDependency(ecommerceLayersStack);
productsAppStack.addDependency(eventDdbStack);

const ordersAppStack = new OrdersAppStack(app, 'OrdersApp', {
  productsDdb: productsAppStack.productsDdb,
  eventsDdb: eventDdbStack.table,
  env,
  tags,
});

ordersAppStack.addDependency(ecommerceLayersStack);
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