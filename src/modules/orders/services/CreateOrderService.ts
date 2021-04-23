import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const existingProducts = await this.productsRepository.findAllById(
      products,
    );

    if (!existingProducts) {
      throw new AppError('No products were found with the ids provided');
    }

    const atLeastOneProductHasInvalidId =
      products.length !== existingProducts.length;

    if (atLeastOneProductHasInvalidId) {
      throw new AppError(`Could not find some of those products`);
    }

    const productsWithInsufficientQuantity = existingProducts.filter(p => {
      const requestedProduct = products.filter(
        requestedProducts => requestedProducts.id === p.id,
      );
      const requestedQuantity = requestedProduct[0].quantity;

      return p.quantity < requestedQuantity;
    });

    if (productsWithInsufficientQuantity.length) {
      throw new AppError(
        `Insufficient quantity for the product with id ${productsWithInsufficientQuantity[0]}`,
      );
    }

    const serializedProducts = products.map(p => ({
      product_id: p.id,
      quantity: p.quantity,
      price: existingProducts.filter(product => product.id === p.id)[0].price,
    }));

    const newOrder = await this.ordersRepository.create({
      customer,
      products: serializedProducts,
    });

    if (!newOrder) {
      throw new AppError(
        'There was an internal error saving your order. Please try again.',
      );
    }

    const updatedQuantities = products.map(p => ({
      id: p.id,
      quantity:
        existingProducts.filter(ep => ep.id === p.id)[0].quantity - p.quantity,
    }));

    await this.productsRepository.updateQuantity(updatedQuantities);

    return newOrder;
  }
}

export default CreateOrderService;
