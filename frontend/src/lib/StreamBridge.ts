export enum STREAM_CONTROL_TYPE {
  READ = "READ",
  CLOSE = "CLOSE",
}

export type StreamResult<T> = {
  done: boolean;
  value?: T;
};

export class StreamBridge {
  static serialize(
    stream: ReadableStream<Uint8Array<ArrayBuffer>>
  ): MessagePort {
    const { port1, port2 } = new MessageChannel();
    let reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>> | null =
      null;

    port1.onmessage = async ({ data: { type } }) => {
      if (type === STREAM_CONTROL_TYPE.READ) {
        if (!reader) {
          reader = stream.getReader();
        }
        const chunk = await reader.read();
        const transfer: Transferable[] = [];
        if (chunk.value instanceof Uint8Array) {
          transfer.push(chunk.value.buffer);
        }
        port1.postMessage(chunk, transfer);
      } else if (type === STREAM_CONTROL_TYPE.CLOSE) {
        if (reader) {
          void reader.cancel();
          reader = null;
        } else {
          void stream.cancel();
        }
      }
    };

    return port2;
  }

  static deserialize(
    port: MessagePort
  ): ReadableStream<Uint8Array<ArrayBuffer>> {
    const stream = new ReadableStream({
      async pull(controller) {
        port.postMessage({ type: STREAM_CONTROL_TYPE.READ });
        const data = await new Promise<StreamResult<Uint8Array<ArrayBuffer>>>(
          (resolve) => {
            port.onmessage = ({
              data,
            }: {
              data: StreamResult<Uint8Array<ArrayBuffer>>;
            }) => {
              resolve(data);
            };
          }
        );
        if (data.done) {
          controller.close();
        }

        controller.enqueue(data.value);
      },
      cancel() {
        port.postMessage(STREAM_CONTROL_TYPE.CLOSE);
      },
    });
    return stream;
  }
}
