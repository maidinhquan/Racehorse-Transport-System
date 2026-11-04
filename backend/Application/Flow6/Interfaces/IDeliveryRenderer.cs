using System.Text.Json.Nodes;
namespace Application.Flow6.Interfaces;
public interface IDeliveryRenderer { byte[] Render(JsonObject revision); }
