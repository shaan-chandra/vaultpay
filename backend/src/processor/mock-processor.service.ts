import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { isPlausiblePan, last4, normalizePan } from './card.util';
import { AuthorizeInput, ProcessorResult } from './processor.types';

type Behaviour = 'approve' | 'decline';

@Injectable()
export class MockProcessorService {
  private readonly logger = new Logger(MockProcessorService.name);

  // TODO 1: the test card table
  //   Hint: private static readonly TEST_CARDS = new Map<string, Behaviour>([
  //           ['4242424242424242', 'approve'],
  //           ['4000000000000002', 'decline'],
  //         ]);
  //   Why static: it's a fixed lookup table, not per-instance state.
  //   Why Map not object literal: a key like '__proto__' returns undefined
  //   from a Map but a function from a plain object. Right default for keys
  //   that came from user input.
  private static readonly Test_Cards = new Map<string, Behaviour>([
    ['4242424242424242', 'approve'],
    ['4000000000000002', 'decline'],
  ]);


  async authorize(input: AuthorizeInput): Promise<ProcessorResult> {
    // TODO 2: normalize the incoming pan
    //   Hint: const pan = normalizePan(input.pan);
    //   Why again: never trust that the caller did it. This function must be
    //   correct on its own.
    const pan = normalizePan(input.pan)

    // TODO 3: reject if it fails Luhn
    //   Hint: if (!isPlausiblePan(pan)) { ... }
    //   Return shape: { approved: false, declineCode: 'invalid_card_number',
    //                   message: 'That card number is not valid.' }
    //   Log NOTHING about the card here — not even last4. Input that fails
    //   Luhn may not be a card at all; it could be a mistyped password.
    //   Hint: this.logger.warn('Authorization rejected: PAN failed Luhn');
    if (!isPlausiblePan(pan)) {
        this.logger.warn('Authorization rejected: PAN failed Luhn');
        return {
            approved: false, 
            declineCode: 'invalid_card_number', 
            message: 'The card number is not valid'
        }

    }

    // TODO 4: reject non-positive amounts
    //   Hint: if (input.amountPaise <= 0) { ... }
    //   Return declineCode 'card_declined', message 'Invalid amount.'
    //   Why: your DTO has @Min(1) but FIXED links read amount from the
    //   database, which the DTO never validated.
    if (input.amountPaise <= 0) {
        return {
            approved: false,
            declineCode: 'card_declined',
            message: 'Invalid amount.'
        }
    }

    // TODO 5: look up the behaviour
    //   Hint: const behaviour = MockProcessorService.TEST_CARDS.get(pan);
    //   Type is Behaviour | undefined — undefined means unknown card.
    const behaviour = MockProcessorService.Test_Cards.get(pan)

    // TODO 6: approve branch
    //   Hint: if (behaviour === 'approve') { ... }
    //   Hint: const processorRef = `mock_auth_${randomUUID()}`;
    //   Hint: this.logger.log(`Authorized •••• ${last4(pan)} ref=${processorRef}`);
    //   Return: { approved: true, processorRef }
    //   Why a ref: stands in for the bank's authorization code. Real gateways
    //   return one so you can reference the transaction later.
    if (behaviour === 'approve') {
        const processorRef = `mock_auth_${randomUUID()}`;
        this.logger.log(`Authorized •••• ${last4(pan)} ref=${processorRef}`);
        return { approved: true, processorRef };

    }

    // TODO 7: decline branch
    //   Hint: if (behaviour === 'decline') { ... }
    //   Hint: log with last4 only
    //   Return declineCode 'card_declined', message 'Your card was declined.'
    if (behaviour === 'decline') {
        this.logger.log(`Declined •••• ${last4(pan)} reason=card_declined`);
        return {
        approved: false,
        declineCode: 'card_declined',
        message: 'Your card was declined.',
    };
}

    // TODO 8: unknown card — FAIL CLOSED
    //   No if needed; this is the fallthrough.
    //   Return declineCode 'card_not_supported',
    //          message 'This card is not supported in test mode.'
    //   Why decline and not approve: "not on my decline list, so approve it"
    //   means every card you forgot about becomes a success. Under fail-closed,
    //   forgetting produces a decline: visible and harmless.
     this.logger.log(`Declined •••• ${last4(pan)} reason=card_not_supported`);
        return {
            approved: false,
            declineCode: 'card_not_supported',
            message: 'This card is not supported in test mode.',
    };
  }
}