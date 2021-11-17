import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
       return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart];   
      const foundProduct = newCart.find(product => product.id === productId);

      const productStock = (await api.get<Stock>("/stock/" + productId)).data;
      const newAmount = foundProduct ? foundProduct.amount + 1 : 1;

      if(newAmount > productStock.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(!foundProduct) {
        const newProduct = (await api.get<Product>("/products/" + productId)).data;
        newCart.push({
          ...newProduct,
          amount: 1
        })
      } else {
        foundProduct.amount = newAmount;
      }

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductInCart = cart.some(product => product.id === productId);
      
      if(!isProductInCart) throw Error();
      
      const newCart = cart.filter(product => product.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount < 1){
        return;
      }

      const newCart = [...cart];   
      const foundProduct = newCart.find(product => product.id === productId);

      const productStock = (await api.get<Stock>("/stock/" + productId)).data;

      if(amount > productStock.amount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(foundProduct) foundProduct.amount = amount;

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
