import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import useProject from '@/hooks/use-project'
import React, { useState } from 'react'
import { askQuestion } from './actions'
import { readStreamableValue } from 'ai/rsc'

type Result = {
    fileName: string;
    sourceCode: string;
    summary: string;
}

const AskQuestionCard = () => {
    const { project } = useProject()
    const [question, setQuestion] = useState('')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [filesReferences, setFilesReferences] = useState<Result[]>([])
    const [answer, setAnswer] = useState('')

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!project?.id) return
        setLoading(true)
        setOpen(true)

        console.log('projectId', project.id)
        const { output, filesReferences } = await askQuestion(question, project.id)
        console.log('output', output)
        console.log('filesReferences', filesReferences)
        setFilesReferences(filesReferences)

        for await (const delta of readStreamableValue(output)) {
            if (delta) {
                setAnswer(ans => ans + delta)
            }
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ask a question</DialogTitle>
                    </DialogHeader>
                    {answer}
                    {filesReferences.map(file => {
                        return <span>{file.fileName}</span>
                    })}
                </DialogContent>
            </Dialog>

            <Card className='relative col-span-3'>
                <CardHeader>
                    <CardTitle>Ask a question</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <Textarea placeholder='Which file should I edit to change the home page?'
                            value={question}
                            onChange={e => setQuestion(e.target.value)} />
                        <div className='h-4'></div>
                        <Button type="submit">
                            Ask GitLooma
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </>
    )
}

export default AskQuestionCard