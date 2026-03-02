import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://egqbuwmplemclhhssqhe.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVncWJ1d21wbGVtY2xoaHNzcWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODc4NDksImV4cCI6MjA4MTA2Mzg0OX0.yOOr5nM1xAD6O0oSC2vPBEKgCV4bndhaIxeZkJB2HXI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
  console.log('Fetching current config for rental...');
  const { data: configRow, error: fetchError } = await supabase
    .from('calculator_config')
    .select('id, config, enabled')
    .eq('calculator_type', 'rental')
    .maybeSingle();

  if (fetchError) {
    console.error('Fetch error:', fetchError);
    return;
  }

  if (!configRow) {
    console.error('No configuration found for "rental" type.');
    return;
  }

  console.log('Current row:', configRow.id);

  console.log('Attempting to update config...');
  const { error: updateError, data } = await supabase
    .from('calculator_config')
    .update({
      enabled: configRow.enabled,
      updated_at: new Date().toISOString()
    })
    .eq('id', configRow.id)
    .select();

  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Update success!', data);
  }
}

testUpdate();
