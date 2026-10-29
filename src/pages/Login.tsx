import { loginSchema, type LoginSchema } from "@/lib/authSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TFieldError from "@/components/TFieldError";
import { errorText } from "@/lib/errorText";
import { supabase } from "@/lib/supabaseClient";

const Login = () => {
    const { t } = useTranslation();
    const { handleSubmit, control, reset } = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: "", password: "" },
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
        <main
            id="main-content"
            className="flex min-h-screen items-center justify-center p-4"
        >
            <div className="w-full sm:max-w-md">
                <div className="mb-2 flex justify-end">
                    <LanguageSwitcher />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>
                            <h1>{t("auth.loginTitle")}</h1>
                        </CardTitle>
                        <CardDescription>{t("auth.loginDescription")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loginMutation.isError && (
                            <p
                                role="alert"
                                className="mb-4 text-sm font-medium text-destructive"
                            >
                                {errorText(t, loginMutation.error)}
                            </p>
                        )}
                        <form id="login-form" onSubmit={handleSubmit(onSubmit)} noValidate>
                            <FieldGroup>
                                <Controller
                                    name="email"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="login-email">
                                                {t("auth.email")}
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="login-email"
                                                type="email"
                                                aria-invalid={fieldState.invalid}
                                                placeholder="example@mail.com"
                                                autoComplete="email"
                                            />
                                            <TFieldError error={fieldState.error} />
                                        </Field>
                                    )}
                                />

                                <Controller
                                    name="password"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid}>
                                            <FieldLabel htmlFor="login-password">
                                                {t("auth.password")}
                                            </FieldLabel>
                                            <Input
                                                {...field}
                                                id="login-password"
                                                type="password"
                                                aria-invalid={fieldState.invalid}
                                                placeholder="••••••••"
                                                autoComplete="current-password"
                                            />
                                            <TFieldError error={fieldState.error} />
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
                                {t("common.reset")}
                            </Button>
                            <Button
                                type="submit"
                                form="login-form"
                                className="flex-1 sm:flex-none"
                                disabled={loginMutation.isPending}
                            >
                                {loginMutation.isPending
                                    ? t("auth.loggingIn")
                                    : t("auth.login")}
                            </Button>
                        </Field>
                        <p className="text-sm text-muted-foreground">
                            {t("auth.noAccount")}{" "}
                            <Link
                                to="/register"
                                className="font-medium text-foreground underline underline-offset-4"
                            >
                                {t("auth.registerLink")}
                            </Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </main>
    );
};

export default Login;
