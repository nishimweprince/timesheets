import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "react-router-dom"
import { ArrowLeftIcon, MailCheckIcon } from "lucide-react"

import AuthShell, { AuthFormHeader } from "@/components/auth/AuthShell"
import Input from "@/components/reusable/inputs/Input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/lib/validations/auth"
import { authApi } from "@/lib/api/auth.api"
import { showApiErrorToast } from "@/lib/api/errors"

const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true)
    try {
      await authApi.forgotPassword({ email: data.email })
      setSubmitted(true)
    } catch (err) {
      showApiErrorToast(err, "forgot-password")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <AuthShell>
        <section className="flex w-full flex-col gap-7">
          <AuthFormHeader
            eyebrow="Account recovery"
            title="Check your email"
            description="If that address is registered, a reset link is on its way. It expires in 15 minutes."
            icon={<MailCheckIcon className="size-5" />}
          />

          <div className="border border-border/70 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            Didn’t get a message? Check spam, or try again with the email on your
            account.
          </div>

          <Button variant="outline" className="h-11 w-full" asChild>
            <Link to="/auth/login">
              <ArrowLeftIcon data-icon="inline-start" />
              Back to sign in
            </Link>
          </Button>
        </section>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <section className="flex w-full flex-col gap-7">
        <AuthFormHeader
          eyebrow="Account recovery"
          title="Reset your password"
          description="Enter the email on your account. We’ll send a reset link if it’s registered."
        />

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-6"
        >
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@tuzahealth.com"
            error={errors.email?.message}
            {...register("email")}
            required
          />

          <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner data-icon="inline-start" />
                Sending link
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>

        <Button variant="ghost" className="h-10 w-full text-muted-foreground" asChild>
          <Link to="/auth/login">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to sign in
          </Link>
        </Button>
      </section>
    </AuthShell>
  )
}

export default ForgotPassword
