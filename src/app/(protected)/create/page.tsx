'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import useRefetch from '@/hooks/use-refetch'
import { api } from '@/trpc/react'
import React, { use } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

type FormInput = {
    projectName: string,
    repoUrl: string
    githubToken?: string
}

const CreatePage = () => {
    const { register, handleSubmit, reset } = useForm<FormInput>();
    const createProject = api.project.createProject.useMutation()
    const refetch = useRefetch()

    const onSubmit = (data: FormInput) => {
        createProject.mutate({
            name: data.projectName,
            githubUrl: data.repoUrl,
            githubToken: data.githubToken
        }, {
            onSuccess: (data) => {
                toast.success('Project created successfully')
                refetch()
                reset()
            },
            onError: (error) => {
                toast.error('Error creating project')
            }
        })
        return true
    }

    return (
        <div className='flex items-center gap-12 h-full justify-center'>
            <img src='/undraw_developer.svg' className='h-56 w-auto' />
            <div>
                <div>
                    <h1 className='font-semibold text-2x1'>
                        Link your GitHub repository
                    </h1>
                </div>
                <div>
                    <p className='text-sm text-mutated-foreground'>
                        Enter the URL of the repository to link it to GitL
                    </p>
                </div>
                <div className='h-4'></div>
                <div>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Input
                            {...register('projectName', { required: true })}
                            placeholder='Project Name'
                            required
                        />
                        <div className='h-2'></div>
                        <Input
                            {...register('repoUrl', { required: true })}
                            placeholder='GitHub URL'
                            type='url'
                            required
                        />
                        <div className='h-2'></div>
                        <Input
                            {...register('githubToken')}
                            placeholder='Github Token(Optional)'
                        />
                        <div className='h-4'></div>
                        <Button type='submit' disabled={createProject.isPending}>
                            Create Project
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default CreatePage