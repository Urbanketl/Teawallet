import Razorpay from "razorpay";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

// Razorpay API timeout (30 seconds for payment gateway operations)
const RAZORPAY_TIMEOUT = 30000;

// Utility function to add timeout to promises with proper cleanup
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Razorpay ${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutHandle)),
    timeoutPromise
  ]);
}

export function initializeRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn("Razorpay credentials not found. Payment processing will be disabled.");
    return null;
  }

  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keyMode = keyId?.startsWith('rzp_test_') ? '🧪 TEST MODE' : keyId?.startsWith('rzp_live_') ? '⚡ LIVE MODE' : '❓ UNKNOWN MODE';
    
    console.log('=== RAZORPAY INITIALIZATION ===');
    console.log('Key ID:', keyId);
    console.log('Mode:', keyMode);
    console.log('Key ID (first 20 chars):', keyId?.substring(0, 20));
    
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  return razorpayInstance;
}

export function getRazorpayInstance() {
  return razorpayInstance;
}

export async function createOrder(amount: number, currency = "INR") {
  const razorpay = initializeRazorpay();
  
  if (!razorpay) {
    throw new Error("Razorpay not initialized. Please check your credentials.");
  }

  const options = {
    amount: Math.round(amount * 100), // Convert to paisa
    currency,
    receipt: `receipt_${Date.now()}`,
    payment_capture: 1,
  };

  console.log('Creating Razorpay order with options:', JSON.stringify(options, null, 2));
  
  // Wrap Razorpay API call with timeout
  const order = await withTimeout(
    razorpay.orders.create(options),
    RAZORPAY_TIMEOUT,
    'order creation'
  );
  
  console.log('Razorpay order created:', JSON.stringify(order, null, 2));
  
  return order;
}

export async function createPaymentLink(
  amount: number,
  customerDetails?: { name?: string; email?: string; contact?: string },
  callbackUrl?: string,
  referenceId?: string
) {
  const razorpay = initializeRazorpay();
  
  if (!razorpay) {
    throw new Error("Razorpay not initialized. Please check your credentials.");
  }

  const options: any = {
    amount: Math.round(amount * 100), // Convert to paisa
    currency: "INR",
    description: "Wallet Recharge - UrbanKetl",
    reference_id: referenceId || `ref_${Date.now()}`,
  };

  if (customerDetails) {
    options.customer = {};
    if (customerDetails.name) options.customer.name = customerDetails.name;
    if (customerDetails.email) options.customer.email = customerDetails.email;
    if (customerDetails.contact) options.customer.contact = customerDetails.contact;
  }

  if (callbackUrl) {
    options.callback_url = callbackUrl;
    options.callback_method = "get"; // Required when callback_url is provided
  }

  console.log('Creating Razorpay payment link with options:', JSON.stringify(options, null, 2));
  
  // Wrap Razorpay API call with timeout
  const paymentLink = await withTimeout(
    razorpay.paymentLink.create(options),
    RAZORPAY_TIMEOUT,
    'payment link creation'
  );
  
  console.log('Razorpay payment link created:', JSON.stringify(paymentLink, null, 2));
  
  return paymentLink;
}

export async function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string
) {
  const razorpay = initializeRazorpay();
  
  if (!razorpay) {
    throw new Error("Razorpay not initialized. Please check your credentials.");
  }

  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === signature;
}

export async function verifyPaymentLink(
  paymentLinkId: string,
  paymentLinkReferenceId: string,
  paymentLinkStatus: string,
  razorpayPaymentId: string,
  signature: string
) {
  const razorpay = initializeRazorpay();
  
  if (!razorpay) {
    throw new Error("Razorpay not initialized. Please check your credentials.");
  }

  // Razorpay payment link signature format: payment_link_id|payment_link_reference_id|payment_link_status|razorpay_payment_id
  const body = `${paymentLinkId}|${paymentLinkReferenceId}|${paymentLinkStatus}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");

  console.log('=== PAYMENT LINK SIGNATURE VERIFICATION ===');
  console.log('Body string:', body);
  console.log('Expected signature:', expectedSignature);
  console.log('Received signature:', signature);
  console.log('Match:', expectedSignature === signature);

  return expectedSignature === signature;
}