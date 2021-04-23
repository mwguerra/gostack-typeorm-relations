import { getRepository, Repository, In } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = this.ormRepository.create({ name, price, quantity });

    await this.ormRepository.save(product);

    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const product = await this.ormRepository.findOne({ where: { name } });

    return product;
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    const ids = products.map(p => p.id);

    const foundProducts = await this.ormRepository.find({
      where: { id: In(ids) },
    });

    return foundProducts;
  }

  public async updateQuantity(
    products: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    const ids = products.map(p => p.id);

    const foundProducts = await this.ormRepository.find({
      where: { id: In(ids) },
    });

    const quantityUpdatedProducts = foundProducts.map(found => {
      const product = products.find(p => p.id === found.id);

      if (!product?.quantity) {
        return found;
      }

      return { ...found, quantity: product.quantity };
    });

    return this.ormRepository.save(quantityUpdatedProducts);
  }
}

export default ProductsRepository;
