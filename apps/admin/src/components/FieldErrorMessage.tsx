type FieldErrorMessageProps = {
  id?: string;
  message: string | undefined;
};

export const FieldErrorMessage = ({ id, message }: FieldErrorMessageProps) =>
  message ? (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
      {message}
    </p>
  ) : null;
