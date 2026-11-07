"""SMTP sink bound to the fixture backend's loopback network namespace."""
import asyncio
from email import policy
from email.parser import BytesParser


async def session(reader, writer):
    writer.write(b"220 fixture SMTP ready\r\n")
    await writer.drain()
    receiving = False
    body = []
    try:
        while line := await reader.readline():
            if receiving:
                if line == b".\r\n":
                    print("----- FIXTURE MAIL -----", flush=True)
                    message = BytesParser(policy=policy.default).parsebytes(b"".join(body))
                    print(message.get_content(), flush=True)
                    body = []
                    receiving = False
                    writer.write(b"250 stored locally\r\n")
                else:
                    body.append(line)
            elif line.upper().startswith((b"EHLO", b"HELO")):
                writer.write(b"250 fixture.local\r\n")
            elif line.upper().startswith(b"DATA"):
                receiving = True
                writer.write(b"354 end with dot\r\n")
            elif line.upper().startswith(b"QUIT"):
                writer.write(b"221 bye\r\n")
                break
            else:
                writer.write(b"250 OK\r\n")
            await writer.drain()
    finally:
        writer.close()
        await writer.wait_closed()


async def main():
    server = await asyncio.start_server(session, "127.0.0.1", 2525)
    async with server:
        await server.serve_forever()


asyncio.run(main())
