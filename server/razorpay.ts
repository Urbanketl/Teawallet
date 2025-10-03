import Razorpay from "razorpay";

let razorpayInstance: Razorpay | null = null;

export function initializeRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.warn("Razorpay credentials not found. Payment processing will be disabled.");
    return null;
  }

  if (!razorpayInstance) {
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
  const order = await razorpay.orders.create(options);
  console.log('Razorpay order created:', JSON.stringify(order, null, 2));
  
  return order;
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

  const crypto = require("crypto");
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body.toString())
    .digest("hex");

  return expectedSignature === signature;
}