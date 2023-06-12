import React, { ErrorInfo } from "react";
import { ErrorBoundaryProps, ErrorBoundaryState } from "./ErrorBoundary.types";

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
    // Aquí puedes realizar acciones adicionales, como enviar el error a un servicio de registro de errores
    // console.error("Error capturado:", error);
    // console.error("Detalles del error:", errorInfo);
  }

  render() {
    const { children, fallback } = this.props;
    const { hasError, error, errorInfo } = this.state;
    // const dispatch = useDispatch();
    // const newNotification: INotification = {
    //   type: "error",
    //   title: error?.toString() ?? "",
    //   description: errorInfo?.componentStack ?? "",
    // };
    // dispatch(addNotification(newNotification));
    // createNotification(
    //   "error",
    //   error?.toString() ?? "",
    //   errorInfo?.componentStack ?? ""
    // );
    if (hasError) {
      return fallback;
    }
    return children;
  }
}

export default ErrorBoundary;
