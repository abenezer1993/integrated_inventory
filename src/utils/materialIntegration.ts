import { useSupabase } from '../contexts/SupabaseContext';

// Material Integration Functions
export interface MaterialConsumption {
  material_id: string;
  quantity_consumed: number;
  notes?: string;
}

export interface MaterialConsumptionResult {
  success: boolean;
  message: string;
  stock_movements?: any[];
  expenses_created?: any[];
  inventory_updated?: boolean;
}

export interface PurchaseOrderReceiving {
  purchase_order_id: string;
  received_items: Array<{
    material_id: string;
    quantity_received: number;
    unit_cost: number;
    notes?: string;
  }>;
}

export interface ManufacturingCostBreakdown {
  materials_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_cost: number;
  cost_per_unit: number;
  profit_margin: number;
}

// Generate movement number
const generateMovementNumber = () => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MV${date}${random}`;
};

// Generate expense number
const generateExpenseNumber = () => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `EXP${date}${random}`;
};

// Consume materials for manufacturing order
export const consumeMaterialsForManufacturing = async (
  manufacturingOrderId: string,
  materials: MaterialConsumption[],
  branchId: string,
  userId: string
): Promise<MaterialConsumptionResult> => {
  const { supabase } = useSupabase();
  
  try {
    const stockMovements: any[] = [];
    const expensesCreated: any[] = [];
    let inventoryUpdated = false;

    // Process each material consumption
    for (const material of materials) {
      // 1. Check material availability
      const { data: inventoryData, error: inventoryError } = await supabase!
        .from('material_inventory')
        .select('quantity, unit_cost')
        .eq('material_id', material.material_id)
        .eq('branch_id', branchId)
        .single();

      if (inventoryError || !inventoryData) {
        return {
          success: false,
          message: `Material not found in inventory: ${material.material_id}`
        };
      }

      const availableQuantity = inventoryData.quantity;
      const unitCost = inventoryData.unit_cost || 0;

      if (availableQuantity < material.quantity_consumed) {
        return {
          success: false,
          message: `Insufficient material: Available ${availableQuantity}, Required ${material.quantity_consumed}`
        };
      }

      // 2. Update material inventory
      const newQuantity = availableQuantity - material.quantity_consumed;
      const totalValue = newQuantity * unitCost;

      const { error: updateError } = await supabase!
        .from('material_inventory')
        .update({
          quantity: newQuantity,
          total_value: totalValue,
          last_updated: new Date().toISOString()
        })
        .eq('material_id', material.material_id)
        .eq('branch_id', branchId);

      if (updateError) {
        return {
          success: false,
          message: `Failed to update inventory: ${updateError.message}`
        };
      }

      inventoryUpdated = true;

      // 3. Record stock movement
      const movementNumber = generateMovementNumber();
      const { data: movementData, error: movementError } = await supabase!
        .from('material_stock_movements')
        .insert({
          movement_number: movementNumber,
          material_id: material.material_id,
          branch_id: branchId,
          movement_type: 'usage',
          quantity: -material.quantity_consumed, // Negative for consumption
          unit_cost: unitCost,
          reference_id: manufacturingOrderId,
          reference_type: 'manufacturing_order',
          notes: material.notes || `Material consumption for manufacturing order`,
          created_by: userId
        })
        .select()
        .single();

      if (movementError) {
        return {
          success: false,
          message: `Failed to record stock movement: ${movementError.message}`
        };
      }

      stockMovements.push(movementData);

      // 4. Create manufacturing expense
      const totalCost = material.quantity_consumed * unitCost;
      const expenseNumber = generateExpenseNumber();

      const { data: expenseData, error: expenseError } = await supabase!
        .from('manufacturing_expenses')
        .insert({
          expense_number: expenseNumber,
          expense_type: 'raw_materials',
          description: `Material consumption: ${material.material_id}`,
          amount: totalCost,
          quantity: material.quantity_consumed,
          unit_cost: unitCost,
          manufacturing_order_id: manufacturingOrderId,
          material_stock_movement_id: movementData.id,
          created_by: userId
        })
        .select()
        .single();

      if (expenseError) {
        return {
          success: false,
          message: `Failed to create expense: ${expenseError.message}`
        };
      }

      expensesCreated.push(expenseData);
    }

    // 5. Update manufacturing order with material costs
    const totalMaterialsCost = expensesCreated.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
    const materialsConsumed = materials.map(material => ({
      material_id: material.material_id,
      quantity_consumed: material.quantity_consumed,
      unit_cost: stockMovements.find((m: any) => m.material_id === material.material_id)?.unit_cost || 0,
      total_cost: material.quantity_consumed * (stockMovements.find((m: any) => m.material_id === material.material_id)?.unit_cost || 0)
    }));

    const { error: updateError } = await supabase!
      .from('manufacturing_orders')
      .update({
        total_materials_cost: totalMaterialsCost,
        materials_consumed: materialsConsumed
      })
      .eq('id', manufacturingOrderId);

    if (updateError) {
      console.warn('Failed to update manufacturing order costs:', updateError);
    }

    return {
      success: true,
      message: 'Materials consumed successfully',
      stock_movements: stockMovements,
      expenses_created: expensesCreated,
      inventory_updated: inventoryUpdated
    };

  } catch (error: any) {
    console.error('Error consuming materials:', error);
    return {
      success: false,
      message: `Error consuming materials: ${error.message}`
    };
  }
};

// Receive purchase order and update inventory
export const receivePurchaseOrder = async (
  purchaseOrderId: string,
  receivedItems: PurchaseOrderReceiving['received_items'],
  branchId: string,
  userId: string
): Promise<{ success: boolean; message: string; inventory_updated?: boolean }> => {
  const { supabase } = useSupabase();
  
  try {
    let inventoryUpdated = false;

    // 1. Update purchase order status
    const { error: orderError } = await supabase!
      .from('purchase_orders')
      .update({
        status: 'received',
        actual_delivery_date: new Date().toISOString()
      })
      .eq('id', purchaseOrderId);

    if (orderError) {
      return {
        success: false,
        message: `Failed to update purchase order: ${orderError.message}`
      };
    }

    // 2. Process each received item
    for (const item of receivedItems) {
      // Check if material exists in inventory
      const { data: existingInventory } = await supabase!
        .from('material_inventory')
        .select('quantity')
        .eq('material_id', item.material_id)
        .eq('branch_id', branchId)
        .single();

      if (existingInventory) {
        // Update existing inventory
        const newQuantity = existingInventory.quantity + item.quantity_received;
        const totalValue = newQuantity * item.unit_cost;

        const { error: updateError } = await supabase!
          .from('material_inventory')
          .update({
            quantity: newQuantity,
            unit_cost: item.unit_cost,
            total_value: totalValue,
            last_updated: new Date().toISOString()
          })
          .eq('material_id', item.material_id)
          .eq('branch_id', branchId);

        if (updateError) {
          return {
            success: false,
            message: `Failed to update inventory: ${updateError.message}`
          };
        }
      } else {
        // Create new inventory record
        const totalValue = item.quantity_received * item.unit_cost;

        const { error: insertError } = await supabase!
          .from('material_inventory')
          .insert({
            material_id: item.material_id,
            branch_id: branchId,
            quantity: item.quantity_received,
            unit_cost: item.unit_cost,
            total_value: totalValue,
            last_updated: new Date().toISOString()
          });

        if (insertError) {
          return {
            success: false,
            message: `Failed to create inventory record: ${insertError.message}`
          };
        }
      }

      // 3. Record stock movement
      const movementNumber = generateMovementNumber();
      const { error: movementError } = await supabase!
        .from('material_stock_movements')
        .insert({
          movement_number: movementNumber,
          material_id: item.material_id,
          branch_id: branchId,
          movement_type: 'purchase',
          quantity: item.quantity_received, // Positive for receiving
          unit_cost: item.unit_cost,
          reference_id: purchaseOrderId,
          reference_type: 'purchase_order',
          notes: item.notes || 'Material received from purchase order',
          created_by: userId
        });

      if (movementError) {
        console.warn('Failed to record stock movement:', movementError);
      }

      inventoryUpdated = true;
    }

    return {
      success: true,
      message: 'Purchase order received successfully',
      inventory_updated: inventoryUpdated
    };

  } catch (error: any) {
    console.error('Error receiving purchase order:', error);
    return {
      success: false,
      message: `Error receiving purchase order: ${error.message}`
    };
  }
};

// Calculate complete manufacturing costs
export const calculateManufacturingCosts = async (
  manufacturingOrderId: string
): Promise<ManufacturingCostBreakdown | null> => {
  const { supabase } = useSupabase();
  
  try {
    // 1. Get manufacturing order details
    const { data: orderData, error: orderError } = await supabase!
      .from('manufacturing_orders')
      .select('quantity_produced, total_materials_cost')
      .eq('id', manufacturingOrderId)
      .single();

    if (orderError || !orderData) {
      console.error('Manufacturing order not found:', orderError);
      return null;
    }

    // 2. Get material expenses for this order
    const { data: materialExpenses, error: expensesError } = await supabase!
      .from('manufacturing_expenses')
      .select('amount')
      .eq('manufacturing_order_id', manufacturingOrderId)
      .eq('expense_type', 'raw_materials');

    if (expensesError) {
      console.error('Error fetching material expenses:', expensesError);
      return null;
    }

    // 3. Get labor expenses for this order
    const { data: laborExpenses, error: laborError } = await supabase!
      .from('manufacturing_expenses')
      .select('amount')
      .eq('manufacturing_order_id', manufacturingOrderId)
      .eq('expense_type', 'labour');

    if (laborError) {
      console.error('Error fetching labor expenses:', laborError);
      return null;
    }

    // 4. Calculate costs
    const materialsCost = materialExpenses?.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0) || orderData.total_materials_cost || 0;
    const laborCost = laborExpenses?.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0) || 0;
    const overheadCost = laborCost * 0.25; // 25% of labor cost for overhead
    const totalCost = materialsCost + laborCost + overheadCost;
    const costPerUnit = orderData.quantity_produced > 0 ? totalCost / orderData.quantity_produced : 0;
    
    // Assume selling price of ETB 35 per unit for profit calculation
    const sellingPrice = 35;
    const profitPerUnit = sellingPrice - costPerUnit;
    const profitMargin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0;

    return {
      materials_cost: materialsCost,
      labor_cost: laborCost,
      overhead_cost: overheadCost,
      total_cost: totalCost,
      cost_per_unit: costPerUnit,
      profit_margin: profitMargin
    };

  } catch (error: any) {
    console.error('Error calculating manufacturing costs:', error);
    return null;
  }
};

// Get material availability for manufacturing
export const getMaterialAvailability = async (
  materialId: string,
  branchId: string
): Promise<{ available: number; unit_cost: number; sufficient: boolean }> => {
  const { supabase } = useSupabase();
  
  try {
    const { data, error } = await supabase!
      .from('material_inventory')
      .select('quantity, unit_cost')
      .eq('material_id', materialId)
      .eq('branch_id', branchId)
      .single();

    if (error || !data) {
      return {
        available: 0,
        unit_cost: 0,
        sufficient: false
      };
    }

    return {
      available: data.quantity || 0,
      unit_cost: data.unit_cost || 0,
      sufficient: data.quantity > 0
    };

  } catch (error: any) {
    console.error('Error checking material availability:', error);
    return {
      available: 0,
      unit_cost: 0,
      sufficient: false
    };
  }
};

// Get low stock materials
export const getLowStockMaterials = async (
  branchId: string
): Promise<Array<{ material_id: string; material_name: string; current_stock: number; min_stock_level: number; unit: string }>> => {
  const { supabase } = useSupabase();
  
  try {
    const { data, error } = await supabase!
      .from('material_inventory')
      .select(`
        *,
        materials (name, unit, min_stock_level)
      `)
      .eq('branch_id', branchId)
      .lt('quantity', 'materials.min_stock_level');

    if (error) throw error;

    return data?.map((item: any) => ({
      material_id: item.material_id,
      material_name: item.materials?.name || 'Unknown',
      current_stock: item.quantity,
      min_stock_level: item.materials?.min_stock_level || 0,
      unit: item.materials?.unit || 'pcs'
    })) || [];

  } catch (error: any) {
    console.error('Error fetching low stock materials:', error);
    return [];
  }
};
