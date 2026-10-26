import { ArrowRight } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface CommonProps {
  variant?: ButtonVariant
  /** Flèche « → » après le libellé. */
  arrow?: boolean
  block?: boolean
  icon?: ReactNode
}

const classes = ({ variant = 'primary', block }: CommonProps, extra?: string) =>
  ['btn', `btn-${variant}`, block ? 'btn-block' : '', extra ?? ''].filter(Boolean).join(' ')

export interface ButtonProps extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  /** Libellé annoncé pendant le chargement. */
  loadingLabel?: string
}

export const Button = ({ variant, arrow, block, icon, loading, loadingLabel, children, className, disabled, type = 'button', ...props }: ButtonProps) => (
  <button
    type={type}
    className={classes({ variant, block }, className)}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading ? <span className="btn-spinner" aria-hidden="true" /> : icon}
    {loading && loadingLabel ? loadingLabel : children}
    {arrow && !loading ? <ArrowRight size={18} aria-hidden="true" /> : null}
  </button>
)

export interface LinkButtonProps extends CommonProps, LinkProps {}

export const LinkButton = ({ variant, arrow, block, icon, children, className, ...props }: LinkButtonProps) => (
  <Link className={classes({ variant, block }, className)} {...props}>
    {icon}
    {children}
    {arrow ? <ArrowRight size={18} aria-hidden="true" /> : null}
  </Link>
)

/** Bouton à icône seule : le nom accessible est obligatoire. */
export const IconButton = ({ label, icon, variant = 'secondary', className, ...props }: { label: string; icon: ReactNode; variant?: ButtonVariant } & ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" className={classes({ variant }, `btn-icon ${className ?? ''}`)} aria-label={label} title={label} {...props}>
    {icon}
  </button>
)
