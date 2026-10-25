import { loginSchema, type LoginSchema } from "@/lib/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { supabase } from "@/lib/supabaseClient";

const Login = () => {
    const { handleSubmit, control, reset } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const loginMutation = useMutation({
        mutationFn: async ({ email, password }: LoginSchema) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            return data;
        },
    });

    const onSubmit = (data: LoginSchema) => {
        loginMutation.mutate(data);
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full sm:max-w-md">
                <CardHeader>
                    <CardTitle>Welcome back</CardTitle>
                    <CardDescription>
                        Log in to join or create a focus room.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loginMutation.isError && (
                        <p
                            role="alert"
                            className="mb-4 text-sm font-medium text-destructive"
                        >
                            {loginMutation.error.message}
                        </p>
                    )}
                    <form id="login-form" onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            {/* Email */}
                            <Controller
                                name="email"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="login-email">
                                            Email Address
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="login-email"
                                            type="email"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="example@mail.com"
                                            autoComplete="email"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            {/* Password */}
                            <Controller
                                name="password"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="login-password">
                                            Password
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="login-password"
                                            type="password"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="••••••••"
                                            autoComplete="current-password"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>
                    </form>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Field orientation="horizontal">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={loginMutation.isPending}
                            onClick={() => {
                                reset();
                                loginMutation.reset();
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            form="login-form"
                            className="flex-1 sm:flex-none"
                            disabled={loginMutation.isPending}
                        >
                            {loginMutation.isPending
                                ? "Logging in..."
                                : "Login"}
                        </Button>
                    </Field>
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link
                            to="/register"
                            className="font-medium text-foreground underline underline-offset-4"
                        >
                            Register
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;