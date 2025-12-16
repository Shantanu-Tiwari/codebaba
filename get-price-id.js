// Run this once to get your price ID
const { Polar } = require('@polar-sh/sdk');

const polar = new Polar({
  accessToken: 'polar_oat_K0qEJpIZ2OtVizV8H53ACTjGXsnk4xzo5Nz1A0TODBd'
});

async function getPriceId() {
  try {
    const result = await polar.products.list();
    const products = result.result?.items || [];
    
    console.log('Products:');
    products.forEach(product => {
      console.log(`Product: ${product.name} (${product.id})`);
      if (product.prices) {
        product.prices.forEach(price => {
          console.log(`  Price: $${price.priceAmount/100} - ID: ${price.id}`);
        });
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

getPriceId();