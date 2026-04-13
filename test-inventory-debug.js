// Test inventory creation and fetching
// Run this in the browser console when logged in as admin

async function testInventory() {
  console.log('=== INVENTORY DEBUG TEST ===');
  
  try {
    // 1. Check current inventory
    console.log('1. Fetching current inventory...');
    const { data: currentInventory, error: inventoryError } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('Current inventory:', currentInventory);
    console.log('Inventory error:', inventoryError);
    
    // 2. Check manufacturing orders
    console.log('2. Fetching manufacturing orders...');
    const { data: manufacturingOrders, error: manufacturingError } = await supabase
      .from('manufacturing_orders')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    
    console.log('Manufacturing orders:', manufacturingOrders);
    console.log('Manufacturing error:', manufacturingError);
    
    // 3. Try to manually insert a test record
    console.log('3. Inserting test inventory record...');
    const { data: insertResult, error: insertError } = await supabase
      .from('inventory')
      .insert({
        product_name: 'Test Board',
        branch_id: 'main-branch',
        quantity: 5,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select();
    
    console.log('Insert result:', insertResult);
    console.log('Insert error:', insertError);
    
    // 4. Check inventory after insert
    console.log('4. Fetching inventory after insert...');
    const { data: updatedInventory } = await supabase
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('Updated inventory:', updatedInventory);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Run the test
testInventory();
