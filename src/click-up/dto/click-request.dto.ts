export class ClickRequestDto {
  click_trans_id: number;
  service_id: number;
  click_paydoc_id: number;
  merchant_user_id?: string;
  merchant_trans_id: string;
  param2?: string;
  amount: number;
  action: 0 | 1;
  error: 0 | 1;
  error_note: string;
  sign_time: string;
  sign_string: string;
  merchant_prepare_id: number;
}
