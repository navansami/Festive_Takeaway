import { Request, Response } from 'express';
import MenuItem from '../models/MenuItem';

export const getAllMenuItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, available } = req.query;

    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (available === 'true') {
      query.isAvailable = true;
    }

    const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });

    res.json({
      success: true,
      count: menuItems.length,
      menuItems
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching menu items' });
  }
};

export const getMenuItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }

    res.json({ success: true, menuItem });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching menu item' });
  }
};

export const createMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, category, pricing, allergens } = req.body;

    const menuItem = await MenuItem.create({
      name,
      description,
      category,
      pricing,
      allergens
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      menuItem
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error creating menu item' });
  }
};

export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, pricing, allergens, isAvailable } = req.body;

    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }

    if (name) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (pricing) menuItem.pricing = pricing;
    if (allergens !== undefined) menuItem.allergens = allergens;
    if (typeof isAvailable === 'boolean') menuItem.isAvailable = isAvailable;

    await menuItem.save();

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      menuItem
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating menu item' });
  }
};

export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      res.status(404).json({ message: 'Menu item not found' });
      return;
    }

    await menuItem.deleteOne();

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error deleting menu item' });
  }
};
