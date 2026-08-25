export type DeclineCode =
  | 'invalid_card_number'
  | 'card_declined'
  | 'card_not_supported';

export interface ProcessorApproval {
  approved: true;
  processorRef: string;
}

export interface ProcessorDecline {
  approved: false;
  declineCode: DeclineCode;
  message: string;
}

export type ProcessorResult = ProcessorApproval | ProcessorDecline;

export interface AuthorizeInput {
  /** Raw PAN. Consumed and discarded — the processor stores nothing. */
  pan: string;
  amountPaise: number;
}