import type { FC, MouseEvent, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogDescription } from '@radix-ui/react-dialog';

function isNestedPortalInteraction(target: HTMLElement): boolean {
  return Boolean(
    target.closest('[data-radix-popper-content-wrapper]') ||
    target.closest('[data-slot="select-content"]') ||
    target.closest('[data-slot="select-item"]') ||
    target.closest('[data-slot="select-trigger"]') ||
    target.closest('[role="listbox"]') ||
    target.closest('[data-radix-select-content]') ||
    target.closest('[data-radix-select-trigger]') ||
    target.closest('[data-radix-select-viewport]') ||
    target.closest('[data-radix-select-item]') ||
    target.closest('[data-radix-popover-content]') ||
    target.closest('[data-radix-popover-trigger]') ||
    target.closest('button[role="combobox"]') ||
    target.closest('button[aria-expanded]'),
  );
}

function preventNestedPortalDismiss(event: { target: EventTarget | null; preventDefault: () => void }) {
  const target = event.target;
  if (target instanceof HTMLElement && isNestedPortalInteraction(target)) {
    event.preventDefault();
  }
}

interface ModalProps {
  isOpen: boolean;
  children: ReactNode;
  onClose: (e?: MouseEvent) => void;
  className?: string;
  mainClassName?: string;
  heading?: string | ReactNode;
  headingClassName?: string;
  description?: string;
  descriptionClassName?: string;
}

const JSX_MODAL: FC<ModalProps> = ({
  isOpen,
  children,
  onClose,
  heading = null,
  headingClassName = null,
  className = null,
  description = null,
  descriptionClassName = null,
}) => {
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`z-9000 !pointer-events-auto min-w-[45vw] ${className ?? ''} overflow-y-auto max-h-[90vh]`}
        onInteractOutside={preventNestedPortalDismiss}
        onPointerDownOutside={preventNestedPortalDismiss}
      >
        <DialogHeader>
          <DialogTitle
            className={`text-lg font-semibold text-primary uppercase mt-[-10px] ${
              headingClassName ?? ''
            }`}
          >
            {heading}
          </DialogTitle>
            <DialogDescription
              className={`text-sm text-gray-500 ${descriptionClassName ?? ''}`}
            >
              {description}
            </DialogDescription>
        </DialogHeader>
        <section className="p-1 overflow-y-auto h-fit">{children}</section>
      </DialogContent>
    </Dialog>
  );
};

const Modal: FC<ModalProps> = (props) => {
  const modalContainer = document.querySelector('#modal');
  if (!modalContainer) {
    throw new Error('Modal container not found');
  }

  return ReactDOM.createPortal(<JSX_MODAL {...props} />, modalContainer);
};

export default Modal;
