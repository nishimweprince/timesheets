import type { FC, FormEvent, ReactNode } from "react"

import Modal from "@/components/reusable/cards/Modal"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

/**
 * A Modal pre-wired as a form: renders a `<form>` around `children` and a
 * standard Cancel / Submit footer with loading state. Pair with `useZodForm`
 * and the `FormInput`/`FormSelect`/`FormTextArea` field wrappers so a page's
 * create/edit dialog is just field declarations.
 *
 * @example
 *   <FormModal isOpen={open} onClose={close} heading="New shift"
 *     onSubmit={form.handleSubmit(onSubmit)} isLoading={isSaving}>
 *     <FormInput control={form.control} name="name" label="Name" />
 *   </FormModal>
 */
export interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  heading: string | ReactNode
  description?: string
  children: ReactNode
  submitLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  /** Disable submit independent of loading (e.g. invalid state). */
  submitDisabled?: boolean
  className?: string
  /** Extra content rendered in the footer, left of the buttons. */
  footerStart?: ReactNode
}

const FormModal: FC<FormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  heading,
  description,
  children,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isLoading = false,
  submitDisabled = false,
  className,
  footerStart,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose()
      }}
      heading={heading}
      description={description}
      className={className}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">{children}</div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">{footerStart}</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={isLoading || submitDisabled}>
              {isLoading && <Spinner />}
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default FormModal
