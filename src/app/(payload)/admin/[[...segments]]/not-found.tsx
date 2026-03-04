import { NotFoundPage } from '@payloadcms/next/views'
import config from '@payload-config'
import { importMap } from '../../importMap'

type Args = {
  params: Promise<{
    segments: string[]
  }>
}

const NotFound = ({ params }: Args) => NotFoundPage({ config, params, importMap })

export default NotFound
