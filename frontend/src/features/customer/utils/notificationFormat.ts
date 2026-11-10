import type { CustomerNotification } from '../types';
import {
  formatNotification as sharedFormatNotification,
  type FormattedNotification as SharedFormattedNotification,
  type GenericNotification,
} from '../../../shared/utils/notificationFormat';

export type FormattedNotification = SharedFormattedNotification;

/**
 * Re-export wrapper for CustomerNotification format
 */
export function formatNotification(n: CustomerNotification): FormattedNotification {
  return sharedFormatNotification(n as unknown as GenericNotification);
}

export default formatNotification;
