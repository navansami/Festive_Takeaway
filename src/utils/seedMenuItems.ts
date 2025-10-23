import MenuItem from '../models/MenuItem';
import { MenuCategory } from '../types';

export const menuItemsData = [
  // ROASTS
  {
    name: 'Whole Roasted Turkey',
    description: 'Served with traditional sage, apple stuffing and cranberry sauce',
    category: MenuCategory.ROASTS,
    pricing: [
      { servingSize: '6kgs For 8 people', price: 550 },
      { servingSize: '8kgs For 10 people', price: 695 }
    ],
    allergens: ['D', 'G'],
    isAvailable: true
  },
  {
    name: 'Whole Roasted Turkey with Sides',
    description: 'Includes 2 side dishes (For 4 people) and 1 small sauce. Served with traditional sage, apple stuffing and cranberry sauce',
    category: MenuCategory.ROASTS,
    pricing: [
      { servingSize: '6kgs For 8 people', price: 650 },
      { servingSize: '8kgs For 10 people', price: 850 }
    ],
    allergens: ['D', 'G'],
    isAvailable: true,
    packageConstraints: [
      {
        servingSize: '6kgs For 8 people',
        allowedSides: {
          maxCount: 2,
          servingSize: 'For 4 people',
          categories: ['potatoes', 'vegetables']
        },
        allowedSauces: {
          maxCount: 1,
          servingSize: 'Small'
        }
      },
      {
        servingSize: '8kgs For 10 people',
        allowedSides: {
          maxCount: 2,
          servingSize: 'For 8 people',
          categories: ['potatoes', 'vegetables']
        },
        allowedSauces: {
          maxCount: 1,
          servingSize: 'Large'
        }
      }
    ]
  },
  {
    name: 'Honey Smoked Ham',
    description: 'Served with pineapple relish',
    category: MenuCategory.ROASTS,
    pricing: [
      { servingSize: '2kgs For 6 people', price: 490 },
      { servingSize: '4kgs For 12 people', price: 790 }
    ],
    allergens: ['D', 'P'],
    isAvailable: true
  },
  {
    name: 'Wild Mushroom and Chickpea Wellington',
    description: 'Roasted parsnips, carrots, fresh herbs, walnuts, puff pastry',
    category: MenuCategory.ROASTS,
    pricing: [{ servingSize: 'For 1 person', price: 95 }],
    allergens: ['G', 'N', 'PB'],
    isAvailable: true
  },

  // SMOKED SALMON
  {
    name: 'House Cured Smoked Salmon',
    description: 'Horseradish sauce, capers, dill pickle, lemon, red onion and rye bread',
    category: MenuCategory.SMOKED_SALMON,
    pricing: [{ servingSize: '350g', price: 150 }],
    allergens: ['G', 'S'],
    isAvailable: true
  },

  // POTATOES
  {
    name: 'Creamed Potatoes',
    description: '',
    category: MenuCategory.POTATOES,
    pricing: [
      { servingSize: 'For 4 people', price: 65 },
      { servingSize: 'For 8 people', price: 105 }
    ],
    allergens: ['D', 'V'],
    isAvailable: true
  },
  {
    name: 'Roasted Potatoes',
    description: '',
    category: MenuCategory.POTATOES,
    pricing: [
      { servingSize: 'For 4 people', price: 65 },
      { servingSize: 'For 8 people', price: 105 }
    ],
    allergens: ['D', 'V'],
    isAvailable: true
  },

  // VEGETABLES
  {
    name: 'Brussel Sprouts',
    description: '',
    category: MenuCategory.VEGETABLES,
    pricing: [
      { servingSize: 'For 4 people', price: 70 },
      { servingSize: 'For 8 people', price: 105 }
    ],
    allergens: ['D', 'V'],
    isAvailable: true
  },
  {
    name: 'Maple Glazed Carrots',
    description: '',
    category: MenuCategory.VEGETABLES,
    pricing: [
      { servingSize: 'For 4 people', price: 70 },
      { servingSize: 'For 8 people', price: 105 }
    ],
    allergens: ['D', 'V'],
    isAvailable: true
  },
  {
    name: 'Cauliflower and Cheese',
    description: '',
    category: MenuCategory.VEGETABLES,
    pricing: [
      { servingSize: 'For 4 people', price: 70 },
      { servingSize: 'For 8 people', price: 105 }
    ],
    allergens: ['D', 'V'],
    isAvailable: true
  },
  {
    name: 'Roasted Parsnips',
    description: '',
    category: MenuCategory.VEGETABLES,
    pricing: [
      { servingSize: 'For 4 people', price: 70 },
      { servingSize: 'For 8 people', price: 105 }
    ],
    allergens: ['D', 'V'],
    isAvailable: true
  },

  // SAUCES
  {
    name: 'Bread Sauce',
    description: '',
    category: MenuCategory.SAUCES,
    pricing: [
      { servingSize: 'Small', price: 40 },
      { servingSize: 'Large', price: 55 }
    ],
    allergens: ['D', 'G'],
    isAvailable: true
  },
  {
    name: 'Turkey Gravy',
    description: '',
    category: MenuCategory.SAUCES,
    pricing: [
      { servingSize: 'Small', price: 45 },
      { servingSize: 'Large', price: 60 }
    ],
    allergens: ['D', 'G'],
    isAvailable: true
  },
  {
    name: 'Red Wine Jus',
    description: '',
    category: MenuCategory.SAUCES,
    pricing: [
      { servingSize: 'Small', price: 55 },
      { servingSize: 'Large', price: 70 }
    ],
    allergens: ['A', 'D'],
    isAvailable: true
  },

  // DESSERTS
  {
    name: 'Homemade Mince Pie',
    description: '',
    category: MenuCategory.DESSERTS,
    pricing: [{ servingSize: 'Individual', price: 10 }],
    allergens: ['D', 'E', 'G', 'N'],
    isAvailable: true
  },
  {
    name: 'Traditional German Stollen 350g',
    description: '',
    category: MenuCategory.DESSERTS,
    pricing: [{ servingSize: '350g', price: 65 }],
    allergens: ['D', 'E', 'G', 'N'],
    isAvailable: true
  },
  {
    name: 'Pecan Pie',
    description: '',
    category: MenuCategory.DESSERTS,
    pricing: [{ servingSize: 'For 8 people', price: 150 }],
    allergens: ['D', 'E', 'G', 'N'],
    isAvailable: true
  },
  {
    name: 'Classic Christmas Pudding with Brandy Sauce 450g',
    description: '',
    category: MenuCategory.DESSERTS,
    pricing: [{ servingSize: '450g For 6 people', price: 120 }],
    allergens: ['A', 'D', 'E', 'G'],
    isAvailable: true
  },
  {
    name: 'Chocolate Praline Rocher Buche 1kg',
    description: '',
    category: MenuCategory.DESSERTS,
    pricing: [{ servingSize: '1kg For 6 people', price: 180 }],
    allergens: ['D', 'E', 'G', 'N'],
    isAvailable: true
  },
  {
    name: 'Homemade Candied Orange and Cranberry Panettone 500g',
    description: '',
    category: MenuCategory.DESSERTS,
    pricing: [{ servingSize: '500g', price: 80 }],
    allergens: ['D', 'E', 'G', 'N'],
    isAvailable: true
  }
];

export const seedMenuItems = async (): Promise<void> => {
  try {
    // Clear existing menu items
    await MenuItem.deleteMany({});
    console.log('Cleared existing menu items');

    // Insert new menu items
    await MenuItem.insertMany(menuItemsData);
    console.log(`Seeded ${menuItemsData.length} menu items successfully`);
  } catch (error) {
    console.error('Error seeding menu items:', error);
    throw error;
  }
};
