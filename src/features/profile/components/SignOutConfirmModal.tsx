import React from 'react';
import { ConfirmDialog } from '../../../components/common/Overlay/ConfirmDialog';

interface SignOutConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSignOut: () => void;
  isLoading?: boolean;
}

export const SignOutConfirmModal: React.FC<SignOutConfirmModalProps> = ({
  visible,
  onClose,
  onConfirmSignOut,
  isLoading = false,
}) => {
  return (
    <ConfirmDialog
      visible={visible}
      title="Sign Out of TANKR?"
      message="You will need to verify your phone number via OTP the next time you sign in. Any active delivery tracking will continue in the background."
      confirmLabel={isLoading ? 'Signing out...' : 'Sign Out'}
      cancelLabel="Cancel"
      isDestructive={true}
      isLoading={isLoading}
      iconName="log-out-outline"
      onConfirm={onConfirmSignOut}
      onCancel={onClose}
    />
  );
};
