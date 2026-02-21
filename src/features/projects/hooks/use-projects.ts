/* eslint-disable react-hooks/purity */
import { useMutation, useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useProjects = () => {
  return useQuery(api.projects.get);
};

export const useProject = (projectId: Id<"projects">) => {
  return useQuery(api.projects.getbyId, { id: projectId });
};

export const useProjectPartial = (limit: number) => {
  return useQuery(api.projects.getPartial, { limit });
};

export const useCreateProject = () => {
  return useMutation(api.projects.create).withOptimisticUpdate(
    (localStorage, args) => {
      const existingProjects = localStorage.getQuery(api.projects.get);
      if (existingProjects !== undefined) {
        const now = Date.now();
        const newProject = {
          _id: crypto.randomUUID() as Id<"projects">,
          _creationTime: now,
          name: args.name,
          ownerId: "anonymous",
          updatedAt: now,
        };
        localStorage.setQuery(api.projects.get, {}, [
          newProject,
          ...existingProjects,
        ]);
      }
    },
  );
};

export const useRenameProject = (projectId: Id<"projects">) => {
  return useMutation(api.projects.rename).withOptimisticUpdate(
    (localStorage, args) => {
      const existingProject = localStorage.getQuery(api.projects.getbyId, {
        id: projectId,
      });
      if (existingProject !== undefined && existingProject !== null) {
        localStorage.setQuery(
          api.projects.getbyId,
          { id: projectId },
          { ...existingProject, name: args.name, updatedAt: Date.now() },
        );
      }
      const existingProjects = localStorage.getQuery(api.projects.get);

      if (existingProjects !== undefined) {
        localStorage.setQuery(
          api.projects.get,
          {},
          existingProjects.map((project) => {
            return project._id === args.id
              ? { ...project, name: args.name, updatedAt: Date.now() }
              : project;
          }),
        );
      }
    },
  );
};
