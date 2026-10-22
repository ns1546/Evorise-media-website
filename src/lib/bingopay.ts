import crypto from "crypto";

export interface BingoPayConfig {
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  merchantId: string;
  mode: "production" | "sandbox";
}

export function getBingoPayConfig(): BingoPayConfig {
  return {
    baseUrl: process.env.BINGOPAY_BASE_URL || "https://api.bingopay.net",
    apiKey: process.env.BINGOPAY_API_KEY || "",
    secretKey: process.env.BINGOPAY_SECRET_KEY || "",
    merchantId: process.env.BINGOPAY_MERCHANT_ID || "",
    mode: "production", // Strictly enforce production mode
  };
}

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  courseTitle: string;
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
}

export interface BingoPayResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId?: string;
  message?: string;
  raw?: any;
}

/**
 * Initiates an automated payment session with Bingo Pay Gateway in Production Mode.
 */
export async function createBingoPayCheckout(params: CreatePaymentParams): Promise<BingoPayResponse> {
  const config = getBingoPayConfig();

  // If credentials are not yet set in environment, prepare clear diagnostic
  if (!config.apiKey || !config.merchantId) {
    console.warn("[BingoPay] API Key or Merchant ID missing in production environment variables.");
  }

  const payload = {
    merchant_id: config.merchantId,
    order_id: params.orderId,
    amount: params.amount,
    currency: params.currency || "BDT",
    product_name: params.courseTitle,
    customer_name: params.customerName,
    customer_email: params.customerEmail,
    customer_phone: params.customerPhone || "01700000000",
    redirect_url: params.returnUrl,
    cancel_url: params.cancelUrl,
    callback_url: params.webhookUrl,
    mode: "production",
    timestamp: Math.floor(Date.now() / 1000),
  };

  // Generate SHA-256 Signature for request integrity
  const dataString = `${payload.merchant_id}|${payload.order_id}|${payload.amount}|${payload.currency}|${config.secretKey}`;
  const signature = crypto.createHash("sha256").update(dataString).digest("hex");

  try {
    const response = await fetch(`${config.baseUrl}/v1/checkout/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`,
        "X-Signature": signature,
      },
      body: JSON.stringify({
        ...payload,
        signature,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        paymentUrl: data.payment_url || data.checkout_url || data.url || data.data?.payment_url,
        transactionId: data.transaction_id || data.trx_id || data.id,
        raw: data,
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error("[BingoPay] Create payment failed:", response.status, errorData);
      return {
        success: false,
        message: errorData.message || `Bingo Pay API error: HTTP ${response.status}`,
        raw: errorData,
      };
    }
  } catch (error: any) {
    console.error("[BingoPay] Network error connecting to gateway:", error);
    return {
      success: false,
      message: error.message || "Failed to connect to Bingo Pay payment server.",
    };
  }
}

/**
 * Validates webhook or IPN callback signature from Bingo Pay.
 */
export function verifyBingoPaySignature(
  orderId: string,
  amount: string | number,
  status: string,
  receivedSignature: string
): boolean {
  const config = getBingoPayConfig();
  if (!config.secretKey) return false;

  const dataString = `${config.merchantId}|${orderId}|${amount}|${status}|${config.secretKey}`;
  const expectedSignature = crypto.createHash("sha256").update(dataString).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature.toLowerCase()),
    Buffer.from((receivedSignature || "").toLowerCase())
  );
}

/**
 * Verifies transaction status directly from Bingo Pay API.
 */
export async function verifyBingoPayTransaction(transactionId: string): Promise<{
  verified: boolean;
  status: string;
  amount?: number;
  orderId?: string;
  raw?: any;
}> {
  const config = getBingoPayConfig();
  try {
    const response = await fetch(`${config.baseUrl}/v1/transactions/${transactionId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      const status = (data.status || data.payment_status || "").toUpperCase();
      return {
        verified: status === "COMPLETED" || status === "SUCCESS" || status === "PAID",
        status,
        amount: data.amount,
        orderId: data.order_id,
        raw: data,
      };
    }
    return { verified: false, status: "FAILED" };
  } catch (error) {
    console.error("[BingoPay] Verification query error:", error);
    return { verified: false, status: "ERROR" };
  }
}
