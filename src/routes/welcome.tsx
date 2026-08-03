import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/welcome')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div className='bg-blue-100 text-blue-800 p-4 rounded-lg'>Hello "/welcome"!</div>
}
