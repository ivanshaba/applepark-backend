// In your frontend submit handler, add more detailed logging:
submitBtn.addEventListener('click', async function () {
  if (!validateForm()) return;
  
  const paymentMethod = document.querySelector('.payment-option.active').getAttribute('data-payment');
  
  // If card is selected, show message and return
  if (paymentMethod === 'card') {
    errorMessage.textContent = 'Card payments are coming soon. Please use Mobile Money for now.';
    errorModal.style.display = 'flex';
    return;
  }
  
  submitBtn.classList.add('loading');

  // Show pending modal
  pendingModal.style.display = 'flex';

  const subscriptionType = document.querySelector('.subscription-option.active').getAttribute('data-type');
  const name = document.getElementById('customer-name').value.trim();
  const email = document.getElementById('customer-email').value.trim();
  const phone = document.getElementById('mobile-number').value.trim();
  const provider = document.getElementById('mobile-provider').value;
  const amountText = document.querySelector('.product-price').textContent;
  const amount = parseInt(amountText.replace(/[^0-9]/g, ''));

  const payload = {
    reference: generateReference(),
    name,
    email,
    phone: normalizePhone(phone),
    amount,
    currency: 'UGX',
    payment_method: 'mobile_money',
    provider: provider.toLowerCase(), // Ensure provider is lowercase
    subscription_type: subscriptionType,
    device_count: 1
  };

  console.log('📤 Sending payload to backend:', payload);

  try {
    const res = await fetch(`${BACKEND_URL}/api/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('📨 Backend response status:', res.status);
    
    let data;
    try {
      data = await res.json();
      console.log('📨 Backend response data:', data);
    } catch (e) {
      console.error('❌ Failed to parse response:', e);
      throw new Error('Invalid response from server');
    }

    if (res.ok) {
      // Show success animation and then success modal
      showSuccessCheckmark();
    } else { 
      pendingModal.style.display = 'none';
      errorMessage.textContent = data.message || 'Payment failed. Please try again.'; 
      errorModal.style.display = 'flex'; 
    }
  } catch (err) {
    console.error('❌ Payment error:', err);
    pendingModal.style.display = 'none';
    errorMessage.textContent = err.message || 'Network error. Please check your connection and try again.';
    errorModal.style.display = 'flex';
  } finally {
    submitBtn.classList.remove('loading');
  }
});