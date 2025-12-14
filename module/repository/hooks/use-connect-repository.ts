"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { connectRepository } from "@/module/repository/actions";
import { toast } from "sonner";

type ConnectRepoInput = {
    owner: string;
    repo: string;
    githubId: number;
};

export const useConnectRepository = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ owner, repo, githubId }: ConnectRepoInput) => {
            return connectRepository(owner, repo, githubId);
        },

        onSuccess: () => {
            toast.success("Repository connected successfully");
            queryClient.invalidateQueries({ queryKey: ["repositories"] });
        },

        onError: (error) => {
            toast.error("Failed to connect repository");
            console.error(error);
        },
    });
};
