export function JiuJitsuWatermark() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Padrão de tatame */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-12 gap-1 h-full">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className="bg-gray-800 border border-gray-700"
              style={{
                aspectRatio: "1",
                transform: `rotate(${(i % 4) * 90}deg)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Marcas d'água de texto */}
      <div className="absolute inset-0 flex flex-col justify-center items-center opacity-5">
        {/* Texto principal */}
        <div className="text-9xl font-bold text-gray-800 transform rotate-45 mb-8">
          TEAM CRUZ
        </div>
        <div className="text-6xl font-semibold text-gray-700 transform -rotate-45">
          BRAZILIAN JIU-JITSU
        </div>
      </div>

      {/* Elementos decorativos */}
      <div className="absolute top-10 left-10 opacity-10">
        <div className="text-4xl font-bold text-gray-800">🥋</div>
      </div>
      <div className="absolute top-20 right-20 opacity-10">
        <div className="text-4xl font-bold text-gray-800">🏆</div>
      </div>
      <div className="absolute bottom-20 left-20 opacity-10">
        <div className="text-4xl font-bold text-gray-800">⚡</div>
      </div>
      <div className="absolute bottom-10 right-10 opacity-10">
        <div className="text-4xl font-bold text-gray-800">🔥</div>
      </div>

      {/* Silhuetas de lutadores */}
      <div className="absolute inset-0">
        {/* Lutador 1 - canto superior esquerdo */}
        <div className="absolute top-32 left-32 opacity-5 transform rotate-12">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-gray-800"
          >
            <path d="M12,2A3,3 0 0,1 15,5A3,3 0 0,1 12,8A3,3 0 0,1 9,5A3,3 0 0,1 12,2M21,9V7H15L13.5,7.5C13.1,7.4 12.6,7.5 12.3,7.8L9.8,10.3C9.4,10.7 9.4,11.4 9.8,11.8L10.2,12.2L8.5,14H7V21H9V16H11L12.2,14.8L14,16.8V21H16V15.8L13.8,13.4L15.3,12C15.7,11.6 15.7,10.9 15.3,10.5L13.5,8.7C13.1,8.3 12.4,8.3 12,8.7L9.5,11.2C9.1,11.6 9.1,12.3 9.5,12.7L11,14.2V21H13V16.8L11.8,15.6L13.5,13.9L15,15.4V21H17V14H15.5L17,12.5C17.4,12.1 17.4,11.4 17,11L14.5,8.5C14.1,8.1 13.4,8.1 13,8.5L10.5,11C10.1,11.4 10.1,12.1 10.5,12.5L12,14V21H14V16L12.5,14.5L15,12C15.4,11.6 15.4,10.9 15,10.5L12.5,8C12.1,7.6 11.4,7.6 11,8L8.5,10.5C8.1,10.9 8.1,11.6 8.5,12L10,13.5V21H12V15.5L10.5,14L13,11.5C13.4,11.1 13.4,10.4 13,10L10.5,7.5C10.1,7.1 9.4,7.1 9,7.5L6.5,10C6.1,10.4 6.1,11.1 6.5,11.5L8,13V21H10V15L8.5,13.5L11,11C11.4,10.6 11.4,9.9 11,9.5L8.5,7C8.1,6.6 7.4,6.6 7,7L4.5,9.5C4.1,9.9 4.1,10.6 4.5,11L6,12.5V21H8V14.5L6.5,13L9,10.5C9.4,10.1 9.4,9.4 9,9L6.5,6.5C6.1,6.1 5.4,6.1 5,6.5L2.5,9C2.1,9.4 2.1,10.1 2.5,10.5L4,12V21H6V14L4.5,12.5L7,10C7.4,9.6 7.4,8.9 7,8.5L4.5,6C4.1,5.6 3.4,5.6 3,6L0.5,8.5C0.1,8.9 0.1,9.6 0.5,10L2,11.5V21H4V13.5L2.5,12L5,9.5C5.4,9.1 5.4,8.4 5,8L2.5,5.5C2.1,5.1 1.4,5.1 1,5.5" />
          </svg>
        </div>

        {/* Lutador 2 - canto inferior direito */}
        <div className="absolute bottom-32 right-32 opacity-5 transform -rotate-12">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-gray-800"
          >
            <path d="M12,2A3,3 0 0,1 15,5A3,3 0 0,1 12,8A3,3 0 0,1 9,5A3,3 0 0,1 12,2M21,9V7H15L13.5,7.5C13.1,7.4 12.6,7.5 12.3,7.8L9.8,10.3C9.4,10.7 9.4,11.4 9.8,11.8L10.2,12.2L8.5,14H7V21H9V16H11L12.2,14.8L14,16.8V21H16V15.8L13.8,13.4L15.3,12C15.7,11.6 15.7,10.9 15.3,10.5L13.5,8.7C13.1,8.3 12.4,8.3 12,8.7L9.5,11.2C9.1,11.6 9.1,12.3 9.5,12.7L11,14.2V21H13V16.8L11.8,15.6L13.5,13.9L15,15.4V21H17V14H15.5L17,12.5C17.4,12.1 17.4,11.4 17,11L14.5,8.5C14.1,8.1 13.4,8.1 13,8.5L10.5,11C10.1,11.4 10.1,12.1 10.5,12.5L12,14V21H14V16L12.5,14.5L15,12C15.4,11.6 15.4,10.9 15,10.5L12.5,8C12.1,7.6 11.4,7.6 11,8L8.5,10.5C8.1,10.9 8.1,11.6 8.5,12L10,13.5V21H12V15.5L10.5,14L13,11.5C13.4,11.1 13.4,10.4 13,10L10.5,7.5C10.1,7.1 9.4,7.1 9,7.5L6.5,10C6.1,10.4 6.1,11.1 6.5,11.5L8,13V21H10V15L8.5,13.5L11,11C11.4,10.6 11.4,9.9 11,9.5L8.5,7C8.1,6.6 7.4,6.6 7,7L4.5,9.5C4.1,9.9 4.1,10.6 4.5,11L6,12.5V21H8V14.5L6.5,13L9,10.5C9.4,10.1 9.4,9.4 9,9L6.5,6.5C6.1,6.1 5.4,6.1 5,6.5L2.5,9C2.1,9.4 2.1,10.1 2.5,10.5L4,12V21H6V14L4.5,12.5L7,10C7.4,9.6 7.4,8.9 7,8.5L4.5,6C4.1,5.6 3.4,5.6 3,6L0.5,8.5C0.1,8.9 0.1,9.6 0.5,10L2,11.5V21H4V13.5L2.5,12L5,9.5C5.4,9.1 5.4,8.4 5,8L2.5,5.5C2.1,5.1 1.4,5.1 1,5.5" />
          </svg>
        </div>
      </div>

      {/* Gradiente sutil */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-red-900/5"></div>
    </div>
  );
}
