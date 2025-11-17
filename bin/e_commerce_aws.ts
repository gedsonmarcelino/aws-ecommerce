#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ProductsAppStack } from '../lib/productsApp-stack';
import { ECommerceApiStack } from '../lib/ecommerceApi-stack';
import { ProductsAppLayersStack } from '../lib/productsAppLayers-stack';
import { EventsDdbStack } from '../lib/eventsDdb-stack';

const app = new cdk.App();

const env: cdk.Environment = {
  account: '421043920384',
  region: 'us-east-1',
};

const tags = {
  cost: 'ECommerceAWS',
  team: 'GDEV Ltda',
}

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

const eCommerceApiStack = new ECommerceApiStack(app, 'ECommerceApiStack', {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  env,
  tags,
});
eCommerceApiStack.addDependency(productsAppStack);
