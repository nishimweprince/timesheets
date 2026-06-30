import type { FC, MouseEvent, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogDescription } from '@radix-ui/react-dialog';

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
        className={`z-[9000] min-w-[45vw] ${className} overflow-y-auto max-h-[90vh]`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
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
