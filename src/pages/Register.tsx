import { registerSchema, type RegisterSchema } from "@/lib/authSchema";
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

const Register = () => {
    const { handleSubmit, control, reset } = useForm<RegisterSchema>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            displayName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const signUpMutation = useMutation({
        mutationFn: async ({
            displayName,
            email,
            password,
        }: RegisterSchema) => {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { display_name: displayName } },
            });
            if (error) throw error;

            if (data.user?.identities?.length === 0) {
                throw new Error(
                    "This email is already registered. Try logging in.",
                );
            }
            return data;
        },
    });

    const onSubmit = (data: RegisterSchema) => {
        signUpMutation.mutate(data);
    };

    // Only true when "Confirm email" is ON in Supabase: user created, no session yet
    const needsEmailConfirm =
        signUpMutation.isSuccess && !signUpMutation.data.session;

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full sm:max-w-md">
                <CardHeader>
                    <CardTitle>Create an account</CardTitle>
                    <CardDescription>
                        Enter your details to create your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {signUpMutation.isError && (
                        <p
                            role="alert"
                            className="mb-4 text-sm font-medium text-destructive"
                        >
                            {signUpMutation.error.message}
                        </p>
                    )}
                    {needsEmailConfirm && (
                        <p className="mb-4 text-sm text-muted-foreground">
                            Account created. Check your email to confirm, then
                            log in.
                        </p>
                    )}

                    <form id="register-form" onSubmit={handleSubmit(onSubmit)}>
                        <FieldGroup>
                            {/* Display Name */}
                            <Controller
                                name="displayName"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="register-displayName">
                                            Display Name
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="register-displayName"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="John Doe"
                                            autoComplete="name"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            {/* Email */}
                            <Controller
                                name="email"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="register-email">
                                            Email Address
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="register-email"
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
                                        <FieldLabel htmlFor="register-password">
                                            Password
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="register-password"
                                            type="password"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            {/* Confirm Password */}
                            <Controller
                                name="confirmPassword"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="register-confirmPassword">
                                            Confirm Password
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="register-confirmPassword"
                                            type="password"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="••••••••"
                                            autoComplete="new-password"
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
                            disabled={signUpMutation.isPending}
                            onClick={() => {
                                reset();
                                signUpMutation.reset();
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            form="register-form"
                            className="flex-1 sm:flex-none"
                            disabled={signUpMutation.isPending}
                        >
                            {signUpMutation.isPending
                                ? "Creating account..."
                                : "Register"}
                        </Button>
                    </Field>
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link
                            to="/login"
                            className="font-medium text-foreground underline underline-offset-4"
                        >
                            Log in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Register;
